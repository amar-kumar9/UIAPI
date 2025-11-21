// --------------------------------------
// Simple mapping from Auth0 user -> Salesforce username
// --------------------------------------
const AUTH0_TO_SF_USER_MAP = {
  'itsamar12@gmail.com': 'edna.frank@aloha.com',
  'freebooks658@gmail.com': 'ajames@uog.com'
};

function mapAuth0UserToSalesforceUsername(oidcUser) {
  if (!oidcUser?.email) return null;
  return AUTH0_TO_SF_USER_MAP[oidcUser.email] || null;
}

module.exports = {
  AUTH0_TO_SF_USER_MAP,
  mapAuth0UserToSalesforceUsername
};
