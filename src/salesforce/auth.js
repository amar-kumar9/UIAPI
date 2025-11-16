const jwt = require('jsonwebtoken');
const axios = require('axios');

let sfAccessTokenCache = {};

function getPrivateKey() {
  if (!process.env.JWT_PRIVATE_KEY) {
    throw new Error('JWT_PRIVATE_KEY env var is required');
  }
  return process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
}

async function getSalesforceSession(sfUsername) {
  if (!sfUsername) {
    throw new Error('Salesforce username is required');
  }

  const cached = sfAccessTokenCache[sfUsername];
  if (cached) return cached;

  const token = jwt.sign(
    {
      iss: process.env.SF_CLIENT_ID,
      sub: sfUsername,
      aud: process.env.SF_LOGIN_URL,
      exp: Math.floor(Date.now() / 1000) + 180
    },
    getPrivateKey(),
    { algorithm: 'RS256' }
  );

  const response = await axios.post(
    `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const session = {
    accessToken: response.data.access_token,
    instanceUrl: response.data.instance_url
  };

  sfAccessTokenCache[sfUsername] = session;
  return session;
}

module.exports = { getSalesforceSession };
