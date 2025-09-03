const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token manquant');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
};

exports.handler = async (event, context) => {
  console.log('Demandeurs Societe function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);
    
    // Check if user is agent (only agents can manage societies)
    const userType = decoded.type_utilisateur || decoded.type;
    if (userType !== 'agent') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ detail: 'Accès non autorisé. Seuls les agents peuvent gérer les sociétés.' })
      };
    }

    const pathParts = event.path.split('/');
    const societeId = pathParts[pathParts.length - 1];

    switch (event.httpMethod) {
      case 'GET':
        console.log('Getting demandeurs societes...');
        
        // Support for pagination
        const queryParams = event.queryStringParameters || {};
        const page = parseInt(queryParams.page) || 1;
        const limit = parseInt(queryParams.limit) || 10;
        const search = queryParams.search || '';
        const offset = (page - 1) * limit;

        let societeQuery;
        let countQuery;
        
        if (search) {
          societeQuery = sql`
            SELECT id, nom_societe, siret, adresse, adresse_complement, 
                   code_postal, ville, numero_tel, email, logo_base64, domaine,
                   favicon_base64, nom_application,
                   created_at, updated_at
            FROM demandeurs_societe 
            WHERE nom_societe ILIKE ${'%' + search + '%'} 
               OR siret ILIKE ${'%' + search + '%'}
               OR email ILIKE ${'%' + search + '%'}
               OR ville ILIKE ${'%' + search + '%'}
               OR domaine ILIKE ${'%' + search + '%'}
            ORDER BY nom_societe
            LIMIT ${limit} OFFSET ${offset}
          `;
          
          countQuery = sql`
            SELECT COUNT(*) as total 
            FROM demandeurs_societe 
            WHERE nom_societe ILIKE ${'%' + search + '%'} 
               OR siret ILIKE ${'%' + search + '%'}
               OR email ILIKE ${'%' + search + '%'}
               OR ville ILIKE ${'%' + search + '%'}
               OR domaine ILIKE ${'%' + search + '%'}
          `;
        } else {
          societeQuery = sql`
            SELECT id, nom_societe, siret, adresse, adresse_complement, 
                   code_postal, ville, numero_tel, email, logo_base64, domaine,
                   favicon_base64, nom_application,
                   created_at, updated_at
            FROM demandeurs_societe 
            ORDER BY nom_societe
            LIMIT ${limit} OFFSET ${offset}
          `;
          
          countQuery = sql`SELECT COUNT(*) as total FROM demandeurs_societe`;
        }

        const [societes, totalResult] = await Promise.all([societeQuery, countQuery]);
        const total = parseInt(totalResult[0].total);
        const totalPages = Math.ceil(total / limit);

        console.log(`Demandeurs Societes found: ${societes.length} (page ${page}/${totalPages})`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: societes,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            }
          })
        };

      case 'POST':
        console.log('Creating demandeurs societe...');
        const newSociete = JSON.parse(event.body);
        const { 
          nom_societe, 
          siret, 
          adresse, 
          adresse_complement, 
          code_postal, 
          ville, 
          numero_tel, 
          email,
          logo_base64,
          domaine
        } = newSociete;
        
        if (!nom_societe || !adresse || !code_postal || !ville || !email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              detail: 'Les champs obligatoires doivent être remplis: nom_societe, adresse, code_postal, ville, email' 
            })
          };
        }

        // Validation du format de domaine si fourni
        if (domaine) {
          const domaineRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
          if (!domaineRegex.test(domaine) || domaine.includes('http') || domaine.length < 4 || !domaine.includes('.')) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                detail: 'Format de domaine invalide. Utilisez le format: exemple.com (sans http/https, minimum 4 caractères avec un point)' 
              })
            };
          }
        }

        // Check if domain already exists (if provided)
        if (domaine) {
          const existingDomaine = await sql`
            SELECT domaine FROM demandeurs_societe WHERE domaine = ${domaine}
          `;
          
          if (existingDomaine.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ detail: 'Ce domaine est déjà utilisé' })
            };
          }
        }

        // Check if SIRET already exists (if provided)
        if (siret) {
          const existingSiret = await sql`
            SELECT siret FROM demandeurs_societe WHERE siret = ${siret}
          `;
          
          if (existingSiret.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ detail: 'Ce SIRET est déjà utilisé' })
            };
          }
        }

        // Check if email already exists
        const existingEmail = await sql`
          SELECT email FROM demandeurs_societe WHERE email = ${email}
        `;
        
        if (existingEmail.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Cet email est déjà utilisé' })
          };
        }
        
        const createdSociete = await sql`
          INSERT INTO demandeurs_societe (
            id, nom_societe, siret, adresse, adresse_complement, 
            code_postal, ville, numero_tel, email, logo_base64, domaine
          )
          VALUES (
            ${uuidv4()}, ${nom_societe}, ${siret}, ${adresse}, ${adresse_complement}, 
            ${code_postal}, ${ville}, ${numero_tel}, ${email}, ${logo_base64}, ${domaine}
          )
          RETURNING id, nom_societe, siret, adresse, adresse_complement, 
                    code_postal, ville, numero_tel, email, logo_base64, domaine,
                    created_at, updated_at
        `;
        
        console.log('Demandeurs Societe created:', createdSociete[0]);
        return { statusCode: 201, headers, body: JSON.stringify(createdSociete[0]) };

      case 'PUT':
        const updateData = JSON.parse(event.body);
        const { 
          nom_societe: upd_nom, 
          siret: upd_siret, 
          adresse: upd_adresse, 
          adresse_complement: upd_complement,
          code_postal: upd_cp, 
          ville: upd_ville, 
          numero_tel: upd_tel, 
          email: upd_email,
          logo_base64: upd_logo,
          domaine: upd_domaine
        } = updateData;
        
        // Validation du format de domaine si fourni
        if (upd_domaine) {
          const domaineRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
          if (!domaineRegex.test(upd_domaine) || upd_domaine.includes('http') || upd_domaine.length < 4 || !upd_domaine.includes('.')) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                detail: 'Format de domaine invalide. Utilisez le format: exemple.com (sans http/https, minimum 4 caractères avec un point)' 
              })
            };
          }
        }

        // Check if domain already exists for another company (if provided)
        if (upd_domaine) {
          const existingDomaine = await sql`
            SELECT domaine FROM demandeurs_societe WHERE domaine = ${upd_domaine} AND id != ${societeId}
          `;
          
          if (existingDomaine.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ detail: 'Ce domaine est déjà utilisé par une autre société' })
            };
          }
        }

        // Check if SIRET already exists for another company (if provided)
        if (upd_siret) {
          const existingSiret = await sql`
            SELECT siret FROM demandeurs_societe WHERE siret = ${upd_siret} AND id != ${societeId}
          `;
          
          if (existingSiret.length > 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ detail: 'Ce SIRET est déjà utilisé par une autre société' })
            };
          }
        }

        // Check if email already exists for another company
        const existingEmailUpdate = await sql`
          SELECT email FROM demandeurs_societe WHERE email = ${upd_email} AND id != ${societeId}
        `;
        
        if (existingEmailUpdate.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Cet email est déjà utilisé par une autre société' })
          };
        }
        
        // Mise à jour de la société avec updated_at explicite pour éviter le trigger
        const updatedSociete = await sql`
          UPDATE demandeurs_societe 
          SET nom_societe = ${upd_nom}, siret = ${upd_siret}, adresse = ${upd_adresse}, 
              adresse_complement = ${upd_complement}, code_postal = ${upd_cp}, 
              ville = ${upd_ville}, numero_tel = ${upd_tel}, email = ${upd_email},
              logo_base64 = ${upd_logo}, domaine = ${upd_domaine}, updated_at = NOW()
          WHERE id = ${societeId}
          RETURNING id, nom_societe, siret, adresse, adresse_complement, 
                    code_postal, ville, numero_tel, email, logo_base64, domaine,
                    created_at, updated_at
        `;
        
        if (updatedSociete.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Société non trouvée' })
          };
        }
        
        return { statusCode: 200, headers, body: JSON.stringify(updatedSociete[0]) };

      case 'DELETE':
        // Check if society has associated demandeurs
        const associatedDemandeurs = await sql`
          SELECT id FROM demandeurs WHERE societe_id = ${societeId}
        `;
        
        if (associatedDemandeurs.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              detail: `Impossible de supprimer cette société. ${associatedDemandeurs.length} demandeur(s) y sont encore associés.` 
            })
          };
        }

        const deletedSociete = await sql`DELETE FROM demandeurs_societe WHERE id = ${societeId} RETURNING id`;
        
        if (deletedSociete.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Société non trouvée' })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Société supprimée avec succès' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Demandeurs Societe API error:', error);
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Token invalide' })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Erreur serveur: ' + error.message })
    };
  }
};