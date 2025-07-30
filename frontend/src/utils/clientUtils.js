// Fonction pour obtenir le nom du client formaté
export const formatClientDisplay = (client) => {
  if (!client || !client.nom_societe) return 'Client sans nom';
  
  let display = client.nom_societe;
  
  if (client.nom && client.prenom) {
    display += ` (${client.nom} ${client.prenom})`;
  } else if (client.nom) {
    display += ` (${client.nom})`;
  } else if (client.prenom) {
    display += ` (${client.prenom})`;
  }
  
  return display;
};