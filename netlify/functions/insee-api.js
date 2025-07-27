const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  console.log('INSEE API function called:', event.httpMethod);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { siret } = event.queryStringParameters || {};
    
    if (!siret) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'SIRET is required' })
      };
    }

    // Nettoyer le SIRET (supprimer espaces et points)
    const cleanSiret = siret.replace(/[\s\.]/g, '');
    
    // Vérifier que le SIRET fait exactement 14 chiffres
    if (!/^\d{14}$/.test(cleanSiret)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'SIRET must be exactly 14 digits' })
      };
    }

    const INSEE_API_KEY = process.env.INSEE_API_KEY;
    
    if (!INSEE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'INSEE API key not configured' })
      };
    }

    // Appeler l'API INSEE
    const response = await fetch(`https://api.insee.fr/api-sirene/3.11/siret/${cleanSiret}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-INSEE-Api-Key-Integration': INSEE_API_KEY
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'SIRET not found' })
        };
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `INSEE API error: ${response.status}` })
      };
    }

    const data = await response.json();
    
    // Extraire les informations utiles
    const etablissement = data.etablissement;
    const adresse = etablissement.adresseEtablissement;
    const uniteLegale = etablissement.uniteLegale;
    
    const result = {
      siret: etablissement.siret,
      denomination: uniteLegale.denominationUniteLegale || 
                   (uniteLegale.nomUniteLegale && uniteLegale.prenom1UniteLegale ? 
                    `${uniteLegale.prenom1UniteLegale} ${uniteLegale.nomUniteLegale}` : ''),
      adresse: {
        numeroVoie: adresse.numeroVoieEtablissement || '',
        typeVoie: adresse.typeVoieEtablissement || '',
        libelleVoie: adresse.libelleVoieEtablissement || '',
        codePostal: adresse.codePostalEtablissement || '',
        commune: adresse.libelleCommuneEtablissement || '',
        adresseComplete: [
          adresse.numeroVoieEtablissement,
          adresse.typeVoieEtablissement,
          adresse.libelleVoieEtablissement
        ].filter(Boolean).join(' ')
      },
      etatAdministratif: etablissement.periodesEtablissement && 
                        etablissement.periodesEtablissement.length > 0 ? 
                        etablissement.periodesEtablissement[0].etatAdministratifEtablissement : null,
      activitePrincipale: etablissement.periodesEtablissement && 
                         etablissement.periodesEtablissement.length > 0 ? 
                         etablissement.periodesEtablissement[0].activitePrincipaleEtablissement : null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('INSEE API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error: ' + error.message })
    };
  }
};