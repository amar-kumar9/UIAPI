const express = require('express');
const { getRecord, getRecordsList } = require('../salesforce/uiApi');
const { getFeedElements, getApprovals } = require('../salesforce/connectApi');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/list', requireAuth, async (req, res) => {
  try {
    const cases = await getRecordsList(req.sfSession, 'Case', 'CaseNumber,Subject,Status,Priority');
    res.json({ cases });
  } catch (error) {
    console.error('Error fetching cases:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch cases', detail: error.response?.data || error.message });
  }
});

router.get('/:caseId', requireAuth, async (req, res) => {
  try {
    const [caseData, feed, approvals] = await Promise.all([
      getRecord(req.sfSession, req.params.caseId),
      getFeedElements(req.sfSession, req.params.caseId),
      getApprovals(req.sfSession, req.params.caseId)
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
