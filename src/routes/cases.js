const express = require('express');
const { getSalesforceSession } = require('../salesforce/auth');
const { getRecord, getRecordsList } = require('../salesforce/uiApi');
const { getFeedElements, getApprovals } = require('../salesforce/connectApi');

const router = express.Router();

function mapAuth0UserToSalesforceUsername(oidcUser) {
  if (!oidcUser?.email) return null;
  if (oidcUser.email === 'itsamar12@gmail.com') return 'edna.frank@aloha.com';
  if (oidcUser.email === 'freebooks658@gmail.com') return 'ashley.james@aloha.com';
  return null;
}

router.get('/list', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({ error: 'No Salesforce mapping' });
    }

    const session = await getSalesforceSession(sfUsername);
    const cases = await getRecordsList(session, 'Case', 'CaseNumber,Subject,Status,Priority');

    res.json({ cases });
  } catch (error) {
    console.error('Error fetching cases:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch cases', detail: error.response?.data || error.message });
  }
});

router.get('/:caseId', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({ error: 'No Salesforce mapping' });
    }

    const session = await getSalesforceSession(sfUsername);
    const [caseData, feed, approvals] = await Promise.all([
      getRecord(session, req.params.caseId),
      getFeedElements(session, req.params.caseId),
      getApprovals(session, req.params.caseId)
    ]);

    res.json({
      case: caseData,
      feed: feed.elements || [],
      approvals: approvals.approvals || []
    });
  } catch (error) {
    console.error('Error fetching case:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch case', detail: error.response?.data || error.message });
  }
});

module.exports = router;
