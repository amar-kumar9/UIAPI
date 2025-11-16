const axios = require('axios');

async function getFeedElements(session, recordId) {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/connect/feeds/record/${recordId}/feed-elements`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
  return response.data;
}

async function postFeedElement(session, recordId, text) {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/connect/feeds/feed-elements`;
  const response = await axios.post(
    url,
    {
      body: { messageSegments: [{ type: 'Text', text }] },
      feedElementType: 'FeedItem',
      subjectId: recordId
    },
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );
  return response.data;
}

async function getApprovals(session, recordId) {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/connect/approvals`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    params: { contextId: recordId }
  });
  return response.data;
}

async function processApproval(session, approvalId, action, comments) {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/connect/approvals/${approvalId}`;
  const response = await axios.post(
    url,
    { action, comments },
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );
  return response.data;
}

module.exports = { getFeedElements, postFeedElement, getApprovals, processApproval };
