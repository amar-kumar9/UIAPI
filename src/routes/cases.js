const express = require('express');
const axios = require('axios');
const { getSalesforceSession } = require('../salesforce/auth');
const { getRecord, getRecordsList, createRecord } = require('../salesforce/uiApi');
const { getFeedElements, getApprovals } = require('../salesforce/connectApi');
const { mapAuth0UserToSalesforceUsername } = require('../userMapping');

const router = express.Router();

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

router.post('/', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({ error: 'No Salesforce mapping' });
    }

    const { subject, description } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const session = await getSalesforceSession(sfUsername);
    const result = await createRecord(session, 'Case', {
      Subject: subject,
      Description: description || '',
      Status: 'New',
      Origin: 'Web'
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating case:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create case', detail: error.response?.data || error.message });
  }
});

router.get('/articles', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({ error: 'No Salesforce mapping' });
    }

    const q = req.query.q;
    if (!q || q.length < 3) {
      return res.json({ articles: [] });
    }

    const session = await getSalesforceSession(sfUsername);
    
    // SOSL Search
    const sosl = `FIND {${q}} IN ALL FIELDS RETURNING KnowledgeArticleVersion (Id, Title, Summary, UrlName, ArticleNumber WHERE PublishStatus='Online' AND Language='en_US') LIMIT 5`;
    
    const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/search/?q=${encodeURIComponent(sosl)}`;
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    res.json({ articles: response.data.searchRecords || [] });
  } catch (error) {
    console.error('Error searching articles:', error.response?.data || error.message);
    // Don't fail hard on knowledge search, just return empty
    res.json({ articles: [] });
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
