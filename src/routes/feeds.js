const express = require('express');
const { postFeedElement } = require('../salesforce/connectApi');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/:recordId', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await postFeedElement(req.sfSession, req.params.recordId, text);
    res.json({ success: true, feedElement: result });
  } catch (error) {
    console.error('Error posting feed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to post feed', detail: error.response?.data || error.message });
  }
});

module.exports = router;
