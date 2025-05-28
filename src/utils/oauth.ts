import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import fetch from 'node-fetch';
import { OAUTH_CONFIG } from '../config.js';

/**
 * OAuth Authentication Module for Autodesk Construction Cloud
 * Handles 3-legged OAuth flow for forms access
 */

interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    expires_at: number;
}

/**
 * Main function to authenticate with OAuth and get tokens
 */
export async function authenticateWithOAuth(): Promise<OAuthTokens> {
    // Clean OAuth flow without console.log statements that interfere with MCP protocol
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
            // MCP-friendly logging - avoid console.log during tool execution
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
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication Failed</h1><p>You can close this window.</p>');
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
    }
    
    if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication Successful</h1><p>You can close this window and return to your application.</p>');
        server.close();
        resolve(code);
        return;
    }
    
    res.writeHead(400, { 'Content-Type': 'text/html' });
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
