const express = require('express');
const { getSalesforceSession } = require('../salesforce/auth');
const { postFeedElement } = require('../salesforce/connectApi');

const router = express.Router();

function mapAuth0UserToSalesforceUsername(oidcUser) {
  if (!oidcUser?.email) return null;
  if (oidcUser.email === 'itsamar12@gmail.com') {
    return 'edna.frank@aloha.com';
  }
  return null;
}

router.post('/:recordId', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({ error: 'No Salesforce mapping' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const session = await getSalesforceSession(sfUsername);
    const result = await postFeedElement(session, req.params.recordId, text);

    res.json({ success: true, feedElement: result });
  } catch (error) {
    console.error('Error posting feed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to post feed', detail: error.response?.data || error.message });
  }
});

module.exports = router;
