const { getSalesforceSession } = require('../salesforce/auth');
const { mapAuth0UserToSalesforceUsername } = require('../utils/userMapping');

async function requireAuth(req, res, next) {
  if (!req.oidc) {
    return res.status(401).json({ error: 'Authentication not initialized' });
  }

  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
  if (!sfUsername) {
    return res.status(403).json({ error: 'No Salesforce mapping' });
  }

  try {
    req.sfSession = await getSalesforceSession(sfUsername);
    req.sfUsername = sfUsername;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate with Salesforce', detail: error.message });
  }
}

module.exports = { requireAuth };
