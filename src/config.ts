import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Get the directory of the current module (works in both built and source)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (one level up from build/config.js)
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const { 
    APS_CLIENT_ID, 
    APS_CLIENT_SECRET, 
    APS_OAUTH_CLIENT_ID,
    APS_OAUTH_CLIENT_SECRET,
    APS_SA_ID, 
    APS_SA_EMAIL, 
    APS_SA_KEY_ID, 
    APS_SA_PRIVATE_KEY 
} = process.env;

// OAuth Configuration for 3-legged authentication
// These settings control how the OAuth flow works for user authentication
export const OAUTH_CONFIG = {
    // OAuth credentials for the web application that supports callback URLs
    clientId: APS_OAUTH_CLIENT_ID!,
    clientSecret: APS_OAUTH_CLIENT_SECRET!,
    // The port where our temporary OAuth callback server will listen
    // Using a high port number to avoid conflicts with other services
    callbackPort: 8765,
    // The redirect URI that Autodesk will send the authorization code to
    // This must match what's configured in your Autodesk app settings
    redirectUri: `http://localhost:8765/oauth/callback`,
    // OAuth endpoints for Autodesk Platform Services v2
    authorizeUrl: 'https://developer.api.autodesk.com/authentication/v2/authorize',
    tokenUrl: 'https://developer.api.autodesk.com/authentication/v2/token',
    // Scopes needed for ACC API access - comprehensive permissions for construction management
    scopes: ['data:read', 'data:write', 'data:create', 'data:search', 'account:read', 'account:write']
};

export {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_OAUTH_CLIENT_ID,
    APS_OAUTH_CLIENT_SECRET,
    APS_SA_ID,
    APS_SA_EMAIL,
    APS_SA_KEY_ID,
    APS_SA_PRIVATE_KEY
}