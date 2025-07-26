const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Vérification du token JWT pour sécurité
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token manquant' })
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
    
    // Seuls les agents peuvent exécuter les migrations
    const userType = decoded.type_utilisateur || decoded.type;
    if (userType !== 'agent') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Seuls les agents peuvent exécuter les migrations' })
      };
    }

    const results = [];

    // 1. Migrer les données existantes des colonnes vers la table portabilite_fichiers
    try {
      const migrateResult = await sql`
        INSERT INTO portabilite_fichiers (portabilite_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by, uploaded_at)
        SELECT 
            p.id as portabilite_id,
            p.fichier_pdf_nom as nom_fichier,
            'application/pdf' as type_fichier,
            LENGTH(p.fichier_pdf_contenu) as taille_fichier,
            p.fichier_pdf_contenu as contenu_base64,
            p.demandeur_id as uploaded_by,
            p.created_at as uploaded_at
        FROM portabilites p
        WHERE p.fichier_pdf_nom IS NOT NULL 
          AND p.fichier_pdf_nom != ''
          AND p.fichier_pdf_contenu IS NOT NULL 
          AND p.fichier_pdf_contenu != ''
          AND NOT EXISTS (
            SELECT 1 FROM portabilite_fichiers pf 
            WHERE pf.portabilite_id = p.id 
            AND pf.nom_fichier = p.fichier_pdf_nom
          )
      `;
      results.push(`Migrated ${migrateResult.length} files`);
    } catch (error) {
      results.push(`Migration error: ${error.message}`);
    }

    // 2. Supprimer les colonnes inutiles de la table portabilites
    try {
      await sql`ALTER TABLE portabilites DROP COLUMN IF EXISTS fichier_pdf_nom`;
      results.push('Dropped column fichier_pdf_nom');
    } catch (error) {
      results.push(`Drop column error: ${error.message}`);
    }

    try {
      await sql`ALTER TABLE portabilites DROP COLUMN IF EXISTS fichier_pdf_contenu`;
      results.push('Dropped column fichier_pdf_contenu');
    } catch (error) {
      results.push(`Drop column error: ${error.message}`);
    }

    // 3. Vérifier que la table portabilite_fichiers a la bonne structure
    try {
      // Vérifier si la colonne type_fichier existe
      const typeColumn = await sql`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portabilite_fichiers' AND column_name = 'type_fichier'
      `;
      
      if (typeColumn.length === 0) {
        await sql`ALTER TABLE portabilite_fichiers ADD COLUMN type_fichier VARCHAR(100)`;
        results.push('Added column type_fichier');
      } else {
        results.push('Column type_fichier already exists');
      }
    } catch (error) {
      results.push(`Type column error: ${error.message}`);
    }

    try {
      // Vérifier si la colonne taille_fichier existe
      const sizeColumn = await sql`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'portabilite_fichiers' AND column_name = 'taille_fichier'
      `;
      
      if (sizeColumn.length === 0) {
        await sql`ALTER TABLE portabilite_fichiers ADD COLUMN taille_fichier INTEGER`;
        results.push('Added column taille_fichier');
      } else {
        results.push('Column taille_fichier already exists');
      }
    } catch (error) {
      results.push(`Size column error: ${error.message}`);
    }

    // 4. Mettre à jour les types de fichiers existants si nécessaire
    try {
      await sql`
        UPDATE portabilite_fichiers 
        SET type_fichier = 'application/pdf' 
        WHERE type_fichier IS NULL AND nom_fichier ILIKE '%.pdf'
      `;
      results.push('Updated PDF file types');
    } catch (error) {
      results.push(`Update file types error: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Migration completed',
        results: results
      })
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Migration failed: ' + error.message })
    };
  }
};