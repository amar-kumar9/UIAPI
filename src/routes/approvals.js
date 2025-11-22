const express = require('express');
const { processApproval } = require('../salesforce/connectApi');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/:approvalId/:action', requireAuth, async (req, res) => {
  try {
    const { action, approvalId } = req.params;
    const { comments } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const result = await processApproval(req.sfSession, approvalId, action, comments);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error processing approval:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to process approval', detail: error.response?.data || error.message });
  }
});

module.exports = router;
