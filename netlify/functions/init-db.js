import { neon } from '@netlify/neon';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const sql = neon();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    // Check if admin user already exists
    const existingAdmin = await sql`
      SELECT email FROM agents WHERE email = 'admin@voipservices.fr'
    `;

    if (existingAdmin.length === 0) {
      // Create default admin user: Franck ADMIN
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.hash('admin1234!', 10);
      
      await sql`
        INSERT INTO agents (id, email, password, nom, prenom, societe)
        VALUES (${adminId}, 'admin@voipservices.fr', ${hashedPassword}, 'ADMIN', 'Franck', 'VoIP Services')
      `;

      return new Response(JSON.stringify({ 
        message: 'Utilisateur admin créé avec succès',
        email: 'admin@voipservices.fr',
        password: 'admin1234!',
        nom: 'Franck ADMIN'
      }), {
        status: 200,
        headers,
      });
    } else {
      return new Response(JSON.stringify({ 
        message: 'Utilisateur admin existe déjà',
        email: 'admin@voipservices.fr',
        nom: 'Franck ADMIN'
      }), {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error('Init DB error:', error);
    return new Response(JSON.stringify({ detail: 'Erreur lors de l\'initialisation' }), {
      status: 500,
      headers,
    });
  }
};