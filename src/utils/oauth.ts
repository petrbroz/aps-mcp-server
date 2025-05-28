import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import fetch from 'node-fetch';
import { OAUTH_CONFIG } from '../config.js';

/**
 * Enhanced OAuth Authentication Module with Token Persistence
 * Handles 3-legged OAuth flow with intelligent token management
 * 
 * BEHAVIOR:
 * - First call: Opens browser for authentication
 * - Subsequent calls: Uses cached tokens (no browser)
 * - Token expires: Auto-refreshes using refresh token (no browser)
 * - Refresh fails: Falls back to full authentication (browser opens)
 */

interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    expires_at: number;
}

// In-memory token cache for session persistence
let tokenCache: OAuthTokens | null = null;

/**
 * Main function to authenticate with OAuth - now with intelligent caching
 */
export async function authenticateWithOAuth(): Promise<OAuthTokens> {
    // Check if we have valid cached tokens first
    if (tokenCache && isTokenValid(tokenCache)) {
        return tokenCache;
    }

    // Try to refresh expired tokens
    if (tokenCache && tokenCache.refresh_token) {
        try {
            const refreshedTokens = await refreshAccessToken(tokenCache.refresh_token);
            tokenCache = refreshedTokens;
            return refreshedTokens;
        } catch (error) {
            // Refresh failed, clear cache and fall back to full auth
            tokenCache = null;
        }
    }

    // Perform full OAuth flow only as last resort
    const newTokens = await performFullOAuthFlow();
    tokenCache = newTokens;
    return newTokens;
}

/**
 * Check if cached token is still valid (with 5-minute safety buffer)
 */
function isTokenValid(tokens: OAuthTokens): boolean {
    const now = Date.now();
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes safety buffer
    return tokens.expires_at > (now + expirationBuffer);
}

/**
 * Refresh access token using refresh token (no browser needed)
 */
async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const refreshParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });

    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret}`).toString('base64')}`
        },
        body: refreshParams
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const tokens = await response.json() as Omit<OAuthTokens, 'expires_at'>;
    
    return {
        ...tokens,
        expires_at: Date.now() + (tokens.expires_in * 1000)
    };
}

/**
 * Perform complete OAuth flow (browser opens)
 */
async function performFullOAuthFlow(): Promise<OAuthTokens> {
    const authUrl = buildAuthorizationUrl();
    const authCode = await getAuthorizationCode(authUrl);
    const tokens = await exchangeCodeForTokens(authCode);
    return tokens;
}

/**
 * Creates the authorization URL for Autodesk authentication
 */
function buildAuthorizationUrl(): string {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: OAUTH_CONFIG.clientId,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        scope: OAUTH_CONFIG.scopes.join(' ')
    });
    
    return `${OAUTH_CONFIG.authorizeUrl}?${params.toString()}`;
}

/**
 * Creates temporary server and opens browser to get authorization code
 */
async function getAuthorizationCode(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const server = createServer((req, res) => {
            handleCallback(req, res, resolve, reject, server);
        });
        
        server.listen(OAUTH_CONFIG.callbackPort, async () => {
            await openBrowser(authUrl);
        });
        
        // Set timeout for user authentication
        setTimeout(() => {
            server.close();
            reject(new Error('OAuth authentication timed out after 5 minutes'));
        }, 5 * 60 * 1000);
    });
}

/**
 * Handles the OAuth callback request from Autodesk
 */
function handleCallback(
    req: IncomingMessage, 
    res: ServerResponse, 
    resolve: (code: string) => void,
    reject: (error: Error) => void,
    server: any
) {
    const url = new URL(req.url!, `http://localhost:${OAUTH_CONFIG.callbackPort}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Authentication Failed</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
    }
    
    if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <h1>✅ Authentication Successful!</h1>
            <p><strong>Tokens cached - no more browser pop-ups!</strong></p>
            <p>You can close this window and return to Claude.</p>
        `);
        server.close();
        resolve(code);
        return;
    }
    
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Invalid Request</h1><p>No authorization code received.</p>');
}

/**
 * Exchanges authorization code for access tokens
 */
async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri
    });
    
    const response = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret}`).toString('base64')}`
        },
        body: tokenParams
    });
    
    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }
    
    const tokens = await response.json() as Omit<OAuthTokens, 'expires_at'>;
    
    return {
        ...tokens,
        expires_at: Date.now() + (tokens.expires_in * 1000)
    };
}

/**
 * Opens the system browser to the authorization URL
 */
async function openBrowser(url: string): Promise<void> {
    try {
        const { exec } = await import('child_process');
        const command = process.platform === 'darwin' ? 'open' : 
                       process.platform === 'win32' ? 'start' : 'xdg-open';
        
        exec(`${command} "${url}"`, (error: any) => {
            if (error) {
                console.error('Failed to open browser automatically.');
                console.log(`Please open this URL manually: ${url}`);
            }
        });
    } catch (error) {
        console.error('Could not open browser:', error);
        console.log(`Please open this URL manually: ${url}`);
    }
}

/**
 * Clear cached tokens (useful for testing)
 */
export function clearTokenCache(): void {
    tokenCache = null;
}
