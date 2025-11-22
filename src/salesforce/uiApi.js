const axios = require('axios');

async function getRecord(session, recordId, layoutTypes = 'Full', mode = 'View') {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/ui-api/records/${recordId}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    params: { layoutTypes, mode }
  });
  return response.data;
}

async function getRecordsList(session, objectApiName, fields, pageSize = 20) {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/ui-api/list-records/${objectApiName}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    params: { fields, pageSize }
  });
  return response.data;
}

async function createRecord(session, apiName, fields) {
  const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/ui-api/records`;
  const response = await axios.post(
    url,
    { apiName, fields },
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );
  return response.data;
}

async function searchKnowledgeArticles(session, searchTerm, limit = 10) {
  try {
    // Using SOSL (Salesforce Object Search Language) to search knowledge articles
    const query = `FIND {${searchTerm}} IN ALL FIELDS RETURNING KnowledgeArticleVersion(Id, Title, Summary, PublishStatus WHERE PublishStatus = 'Online' AND Language = 'en_US') LIMIT ${limit}`;
    
    const url = `${session.instanceUrl}/services/data/v${process.env.SF_API_VERSION}/search/sobjects`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      params: { q: query }
    });
    
    // Extract and format knowledge articles
    const articles = [];
    if (response.data.searchRecords && response.data.searchRecords.length > 0) {
      response.data.searchRecords.forEach(record => {
        if (record.attributes && record.attributes.type === 'KnowledgeArticleVersion') {
          articles.push({
            id: record.Id,
            title: record.Title,
            summary: record.Summary || 'No summary available',
            type: 'Knowledge Article'
          });
        }
      });
    }
    
    return articles;
  } catch (error) {
    console.error('Error searching knowledge articles:', error.message);
    return [];
  }
}

module.exports = { getRecord, getRecordsList, createRecord, searchKnowledgeArticles };
