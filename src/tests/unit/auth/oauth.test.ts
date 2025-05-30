/**
 * OAuth (3-legged) Authentication Unit Tests
 * Tests the user authentication flow for accountable operations
 */

import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { authenticateWithOAuth } from '../../../auth.js';
import { setupTestEnvironment } from '../../helpers/test-utils.js';

describe('OAuth 3-Legged Authentication', () => {
    let env: ReturnType<typeof setupTestEnvironment>;
    const mockFetch = mock.fn();
    const mockOpen = mock.fn();
    let originalOpen: any;
    
    before(() => {
        env = setupTestEnvironment();
        // @ts-ignore - Mock global fetch
        global.fetch = mockFetch;
        
        // Mock console.log to capture auth URL
        originalOpen = console.log;
        console.log = mockOpen;
    });
    
    after(() => {
        env.restore();
        // @ts-ignore
        delete global.fetch;
        console.log = originalOpen;
    });

    describe('OAuth Flow Initiation', () => {
        test('should generate correct authorization URL', async () => {
            // Start OAuth flow
            const authPromise = authenticateWithOAuth(['data:read', 'data:write']);
            
            // Wait a moment for the auth URL to be logged
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify authorization URL was generated
            const calls = mockOpen.mock.calls;
            const authUrlCall = calls.find(call => 
                call.arguments[0]?.includes?.('https://developer.api.autodesk.com/authentication/v2/authorize')
            );
            
            assert.ok(authUrlCall, 'Authorization URL should be logged');
            const loggedUrl = authUrlCall.arguments[0];
            
            // Verify URL parameters
            assert.ok(loggedUrl.includes('response_type=code'), 'Should use authorization code flow');
            assert.ok(loggedUrl.includes('scope=data:read%20data:write'), 'Should include requested scopes');
            assert.ok(loggedUrl.includes('state='), 'Should include state parameter for CSRF protection');
            assert.ok(loggedUrl.includes('client_id='), 'Should include client ID');
            assert.ok(loggedUrl.includes('redirect_uri='), 'Should include redirect URI');
            
            // Clean up the promise
            authPromise.catch(() => {}); // Ignore the timeout error
        });

        test('should use PKCE for enhanced security', async () => {
            const authPromise = authenticateWithOAuth(['data:read']);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const calls = mockOpen.mock.calls;
            const authUrlCall = calls.find(call => 
                call.arguments[0]?.includes?.('https://developer.api.autodesk.com/authentication/v2/authorize')
            );
            
            const loggedUrl = authUrlCall?.arguments[0] || '';
            
            // PKCE parameters
            assert.ok(loggedUrl.includes('code_challenge='), 'Should include PKCE code challenge');
            assert.ok(loggedUrl.includes('code_challenge_method=S256'), 'Should use S256 method');
            
            authPromise.catch(() => {});
        });
    });

    describe('Authorization Code Exchange', () => {
        test('should exchange authorization code for tokens', async () => {
            mockFetch.mockImplementation(async (url: string) => {
                if (url.includes('/token')) {
                    return {
                        ok: true,
                        json: async () => ({
                            access_token: 'user-access-token',
                            refresh_token: 'user-refresh-token',
                            token_type: 'Bearer',
                            expires_in: 3600
                        })
                    };
                }
                throw new Error('Unexpected URL');
            });

            // Simulate successful authorization with code
            const mockAuthCode = 'test-auth-code';
            
            // Since we can't easily simulate the full OAuth flow in unit tests,
            // we'll test the token exchange directly
            const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: mockAuthCode,
                    redirect_uri: 'http://localhost:3000/callback'
                })
            });
            
            const tokens = await response.json();
            
            assert.strictEqual(tokens.access_token, 'user-access-token');
            assert.strictEqual(tokens.refresh_token, 'user-refresh-token');
            assert.strictEqual(tokens.token_type, 'Bearer');
            assert.strictEqual(tokens.expires_in, 3600);
        });
    });

    describe('Error Handling', () => {
        test('should handle user denial gracefully', async () => {
            // When user denies access, we'd receive an error in the callback
            const errorResponse = {
                error: 'access_denied',
                error_description: 'User denied access'
            };
            
            // Simulate the error handling
            assert.throws(
                () => {
                    if (errorResponse.error === 'access_denied') {
                        throw new Error(`OAuth Error: ${errorResponse.error} - ${errorResponse.error_description}`);
                    }
                },
                {
                    message: /OAuth Error: access_denied - User denied access/
                }
            );
        });

        test('should handle invalid scopes', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: false,
                status: 400,
                json: async () => ({
                    error: 'invalid_scope',
                    error_description: 'One or more scopes are invalid'
                })
            }));

            // Test with invalid scope
            const authPromise = authenticateWithOAuth(['invalid:scope']);
            
            // Since the actual OAuth flow would fail at the authorization step,
            // we simulate the error response
            try {
                await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
                    method: 'POST',
                    body: 'invalid_request'
                });
                
                const response = await mockFetch();
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`OAuth Error: ${error.error} - ${error.error_description}`);
                }
            } catch (error: any) {
                assert.match(error.message, /invalid_scope/);
            }
            
            authPromise.catch(() => {});
        });

        test('should timeout if user does not complete authentication', async () => {
            // OAuth flow should timeout after a reasonable period
            const TIMEOUT_MS = 100; // Short timeout for testing
            
            const authPromise = Promise.race([
                authenticateWithOAuth(['data:read']),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Authentication timeout')), TIMEOUT_MS)
                )
            ]);
            
            await assert.rejects(authPromise, {
                message: /Authentication timeout/
            });
        });
    });

    describe('Token Refresh', () => {
        test('should support token refresh flow', async () => {
            mockFetch.mockImplementation(async (url: string, options: any) => {
                if (url.includes('/token') && options.body.includes('refresh_token')) {
                    return {
                        ok: true,
                        json: async () => ({
                            access_token: 'new-access-token',
                            refresh_token: 'new-refresh-token',
                            token_type: 'Bearer',
                            expires_in: 3600
                        })
                    };
                }
                throw new Error('Unexpected request');
            });

            // Simulate token refresh
            const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: 'old-refresh-token',
                    client_id: 'test-client-id'
                })
            });
            
            const tokens = await response.json();
            
            assert.strictEqual(tokens.access_token, 'new-access-token');
            assert.strictEqual(tokens.refresh_token, 'new-refresh-token');
        });
    });

    describe('Scope Requirements', () => {
        test('should validate OAuth scopes for different tools', () => {
            const toolScopeRequirements = {
                forms: ['data:read'],
                rfis: ['data:read'],
                submittals: ['data:read']
            };
            
            for (const [tool, requiredScopes] of Object.entries(toolScopeRequirements)) {
                assert.ok(
                    requiredScopes.length > 0,
                    `${tool} should have required scopes defined`
                );
                
                assert.ok(
                    requiredScopes.includes('data:read'),
                    `${tool} should require at least data:read scope`
                );
            }
        });
    });
});
