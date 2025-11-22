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
    const session = await getSalesforceSession(sfUsername);
    let articles = [];

    // Check trimmed length to avoid whitespace-only queries
    if (q && q.trim().length >= 2) {
      // SOSL Search for specific query
      // Split query into terms and append wildcard to each for "lexical" (prefix) matching on all words
      const terms = q.trim().split(/\s+/).filter(t => t.length > 0);
      
      if (terms.length > 0) {
        const searchQuery = terms.map(t => t + '*').join(' AND ');
        
        // Removed Language='en_US' to be more inclusive
        const sosl = `FIND {${searchQuery}} IN ALL FIELDS RETURNING Knowledge__kav (Id, Title, Summary, UrlName, ArticleNumber WHERE PublishStatus='Online') LIMIT 10`;
        const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/search/?q=${encodeURIComponent(sosl)}`;
        const response = await axios.get(url, { headers: { Authorization: `Bearer ${session.accessToken}` } });
        articles = response.data.searchRecords || [];
      }
    } else {
      // SOQL Query for all/recent articles (Default view)
      // Removed Language='en_US' to be more inclusive
      const soql = `SELECT Id, Title, Summary, UrlName, ArticleNumber FROM Knowledge__kav WHERE PublishStatus='Online' ORDER BY LastPublishedDate DESC LIMIT 20`;
      const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/query/?q=${encodeURIComponent(soql)}`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${session.accessToken}` } });
      articles = response.data.records || [];
    }

    res.json({ articles });
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
