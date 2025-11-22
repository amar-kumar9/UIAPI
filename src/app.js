require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { auth } = require('express-openid-connect');

const casesRouter = require('./routes/cases');
const feedsRouter = require('./routes/feeds');
const approvalsRouter = require('./routes/approvals');

const app = express();

const oidcConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.OIDC_CLIENT_SECRET,
  baseURL: process.env.OIDC_APP_BASE_URL,
  clientID: process.env.OIDC_CLIENT_ID,
  issuerBaseURL: process.env.OIDC_ISSUER_BASE_URL
};

app.use(cors());
app.use(express.json());
app.use(auth(oidcConfig));

// Debug middleware to check auth state
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - req.oidc exists: ${!!req.oidc}`);
  if (req.oidc) {
    console.log(`Is Authenticated: ${req.oidc.isAuthenticated()}`);
  } else {
    console.error('CRITICAL: req.oidc is undefined!');
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/profile', (req, res) => {
  if (!req.oidc || !req.oidc.isAuthenticated()) {
    return res.status(401).json({ loggedIn: false });
  }
  res.json({ loggedIn: true, user: req.oidc.user });
});

app.get('/login', (req, res) => res.oidc.login());
app.get('/logout', (req, res) => res.oidc.logout());

app.use('/api/cases', casesRouter);
app.use('/api/feeds', feedsRouter);
app.use('/api/approvals', approvalsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
