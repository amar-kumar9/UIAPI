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

module.exports = { getRecord, getRecordsList, createRecord };
