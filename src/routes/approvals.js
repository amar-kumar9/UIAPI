const express = require('express');
const { getSalesforceSession } = require('../salesforce/auth');
const { processApproval } = require('../salesforce/connectApi');

const router = express.Router();

const { mapAuth0UserToSalesforceUsername } = require('../userMapping');

router.post('/:approvalId/:action', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({ error: 'No Salesforce mapping' });
    }

    const { action, approvalId } = req.params;
    const { comments } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const session = await getSalesforceSession(sfUsername);
    const result = await processApproval(session, approvalId, action, comments);

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error processing approval:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to process approval', detail: error.response?.data || error.message });
  }
});

module.exports = router;
