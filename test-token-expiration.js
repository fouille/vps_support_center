// Script pour tester l'expiration du token
const jwt = require('jsonwebtoken');

// Générer un token expiré pour tester
const generateExpiredToken = () => {
  const payload = {
    sub: 'admin@voipservices.fr',
    id: '123',
    type_utilisateur: 'agent',
    exp: Math.floor(Date.now() / 1000) - 3600 // Expiré depuis 1 heure
  };
  
  const token = jwt.sign(payload, 'dev-secret-key');
  return token;
};

// Générer un token qui expire dans 5 secondes
const generateSoonExpiredToken = () => {
  const payload = {
    sub: 'admin@voipservices.fr',
    id: '123',
    type_utilisateur: 'agent',
    exp: Math.floor(Date.now() / 1000) + 5 // Expire dans 5 secondes
  };
  
  const token = jwt.sign(payload, 'dev-secret-key');
  return token;
};

console.log('=== Test d\'expiration de token ===');
console.log('');

console.log('1. Token déjà expiré :');
console.log(generateExpiredToken());
console.log('');

console.log('2. Token qui expire dans 5 secondes :');
console.log(generateSoonExpiredToken());
console.log('');

console.log('Instructions :');
console.log('1. Copiez un des tokens ci-dessus');
console.log('2. Ouvrez les DevTools du navigateur');
console.log('3. Allez dans Application > Local Storage');
console.log('4. Remplacez la valeur de "token" par le token copié');
console.log('5. Rechargez la page ou faites une action pour voir le comportement');
console.log('');
console.log('Résultat attendu : Notification + redirection vers la connexion');