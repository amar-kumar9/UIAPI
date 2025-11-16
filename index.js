// index.js
require('dotenv').config();



const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { auth } = require('express-openid-connect');

console.log('🔍 JWT env debug:', {
  hasJwtPrivateKey: !!process.env.JWT_PRIVATE_KEY,
  jwtPrivateKeyLength: process.env.JWT_PRIVATE_KEY ? process.env.JWT_PRIVATE_KEY.length : 0,
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || null
});

// Configuration validation
if (
  !process.env.OIDC_CLIENT_ID ||
  process.env.OIDC_CLIENT_ID === 'your-auth0-client-id' ||
  !process.env.OIDC_CLIENT_SECRET ||
  process.env.OIDC_CLIENT_SECRET === 'your-auth0-client-secret' ||
  !process.env.OIDC_ISSUER_BASE_URL ||
  process.env.OIDC_ISSUER_BASE_URL === 'https://your-auth0-domain.auth0.com'
) {
  console.warn(
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
    'WARNING: Auth0 OIDC is not fully configured in your .env file. \n' +
    'Authentication will not work correctly.\n' +
    'Please fill in your Auth0 details in the .env file.\n' +
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
  );
}

const app = express();

// --------------------------------------
// Simple mapping from Auth0 user -> Salesforce username
// --------------------------------------
function mapAuth0UserToSalesforceUsername(oidcUser) {
  if (!oidcUser?.email) return null;

  // For now, we hard-code Edna.
  if (oidcUser.email === 'itsamar12@gmail.com') {
    return 'edna.frank@aloha.com';
  }

  // Later you can extend this to multiple users or a lookup table.
  return null;
}

// --------------------------------------
// Salesforce JWT login helper
// --------------------------------------
let sfAccessTokenCache = {}; // simple per-username cache in memory

function getPrivateKey() {
  if (!process.env.JWT_PRIVATE_KEY) {
    console.error('❌ JWT_PRIVATE_KEY env var is missing or empty');
    throw new Error('JWT_PRIVATE_KEY env var is required but not set');
  }

  console.log(
    '🔑 Using JWT private key from environment variable JWT_PRIVATE_KEY, length:',
    process.env.JWT_PRIVATE_KEY.length
  );

  // Support "\n" in env var
  return process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
}


async function loginToSalesforceAsUser(sfUsername) {
  if (!sfUsername) {
    throw new Error('Salesforce username is required for JWT login');
  }

  // Optional in-memory cache
  const cached = sfAccessTokenCache[sfUsername];
  if (cached) {
    return cached;
  }

  console.log(`🔑 Attempting JWT login for: ${sfUsername}`);
  console.log(`🏢 Login URL: ${process.env.SF_LOGIN_URL}`);
  console.log(`📱 Client ID: ${process.env.SF_CLIENT_ID}`);
  
  const privateKey = getPrivateKey();

  const token = jwt.sign(
    {
      iss: process.env.SF_CLIENT_ID,
      sub: sfUsername,
      aud: process.env.SF_LOGIN_URL,
      exp: Math.floor(Date.now() / 1000) + 180 // 3 minutes
    },
    privateKey,
    { algorithm: 'RS256' }
  );

  try {
    const response = await axios.post(
      `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token: accessToken, instance_url: instanceUrl } = response.data;

    console.log(`🔐 Logged into Salesforce via JWT as ${sfUsername}`);

    const session = { accessToken, instanceUrl };
    sfAccessTokenCache[sfUsername] = session;
    return session;
  } catch (error) {
    console.error(`❌ JWT login failed for ${sfUsername}:`, error.response?.data || error.message);
    throw error;
  }
}

// ----------------------------- 
// 1. OIDC / Auth0 configuration
// ----------------------------- 
const oidcConfig = {
  authRequired: false, // don't force login on every route
  auth0Logout: true,

  // Use a proper session/cookie secret; prefer SESSION_SECRET but fall back to client secret if needed
  secret: process.env.SESSION_SECRET || process.env.OIDC_CLIENT_SECRET,

  // WHERE THIS APP LIVES
  // Prefer BASE_URL (set in Render), then any existing OIDC_APP_BASE_URL, then Render's own external URL
  baseURL: process.env.BASE_URL || process.env.OIDC_APP_BASE_URL || process.env.RENDER_EXTERNAL_URL,

  clientID: process.env.OIDC_CLIENT_ID,
  issuerBaseURL: process.env.OIDC_ISSUER_BASE_URL
};

// Log what the app *actually* sees at startup
console.log('🔧 OIDC config at startup:', {
  baseURL: oidcConfig.baseURL,
  issuerBaseURL: oidcConfig.issuerBaseURL,
  clientID: oidcConfig.clientID,
  hasSecret: !!oidcConfig.secret
});

if (!oidcConfig.baseURL) {
  console.warn('⚠️ OIDC baseURL is missing. Set BASE_URL or OIDC_APP_BASE_URL (or rely on RENDER_EXTERNAL_URL) in your environment.');
}

// ----------------------------- 
// 2. Middleware
// ----------------------------- 
app.use(cors());
app.use(express.json());

// Attach Auth0 / OIDC to the app
app.use(auth(oidcConfig));

// Serve static files (our frontend) from /public
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------- 
// 3. Auth-related routes
// ----------------------------- 

// Check who is logged in (via Auth0)
app.get('/profile', (req, res) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    user: req.oidc.user
  });
});

// Trigger login (redirects to Auth0)
app.get('/login', (req, res) => {
  res.oidc.login();
});

// Trigger logout (clears session + Auth0 logout)
app.get('/logout', (req, res) => {
  res.oidc.logout();
});

// ----------------------------- 
// 4. API routes (backend utilities)
// ----------------------------- 

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running',
    time: new Date().toISOString()
  });
});

// Placeholder "hello" endpoint
app.get('/api/hello', (req, res) => {
  const isAuthenticated = req.oidc?.isAuthenticated();
  res.json({
    message: 'Hello from Node backend. Soon this will call Salesforce UI API',
    auth: isAuthenticated
      ? {
          loggedIn: true,
          sub: req.oidc.user.sub,
          email: req.oidc.user.email
        }
      : { loggedIn: false }
  });
});

// ----------------------------- 
// 5. Salesforce test route – UI API org-info as Edna
// ----------------------------- 
app.get('/api/sf/org-info', async (req, res) => {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.status(401).json({ error: 'Not logged in via IdP' });
    }

    const sfUsername = mapAuth0UserToSalesforceUsername(req.oidc.user);
    if (!sfUsername) {
      return res.status(403).json({
        error: 'No Salesforce mapping for this IdP user',
        idpUser: req.oidc.user
      });
    }

    const { accessToken, instanceUrl } = await loginToSalesforceAsUser(sfUsername);

    // 🔹 Call a core REST endpoint instead of UI API
    const url = `${instanceUrl}/services/data/v${process.env.SF_API_VERSION}/sobjects`;
    console.log('Calling Salesforce:', url);

    const result = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    res.json({
      asSalesforceUser: sfUsername,
      limits: result.data
    });
  } catch (error) {
    console.error('❌ /api/sf/org-info error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to call Salesforce API',
      detail: error.response?.data || error.message
    });
  }
});

// ----------------------------- 
// 6. Start server
// ----------------------------- 
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
