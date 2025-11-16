# Salesforce UI API with Auth0

## Deploy to Render

1. Push this repo to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set environment variables in Render dashboard:
   - `OIDC_ISSUER_BASE_URL`
   - `OIDC_CLIENT_ID`
   - `OIDC_CLIENT_SECRET`
   - `OIDC_APP_BASE_URL` (your Render URL, e.g., https://your-app.onrender.com)
   - `SF_LOGIN_URL`
   - `SF_CLIENT_ID`
   - `SF_API_VERSION`
   - `JWT_PRIVATE_KEY_PATH` (set to `./jwt/server.key`)
   - `PORT` (Render sets this automatically)

5. Add your JWT private key as a secret file:
   - In Render dashboard, go to "Secret Files"
   - Add file at path: `jwt/server.key`
   - Paste your private key content

6. Deploy!

## Local Development

```bash
npm install
npm start
```
