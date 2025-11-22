function mapAuth0UserToSalesforceUsername(oidcUser) {
  if (!oidcUser?.email) return null;
  
  const mapping = {
    'itsamar12@gmail.com': 'edna.frank@aloha.com',
    'freebooks658@gmail.com': 'ashley.james@aloha.com'
  };
  
  return mapping[oidcUser.email] || null;
}

module.exports = { mapAuth0UserToSalesforceUsername };
