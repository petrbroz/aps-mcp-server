/**
 * Service Account Authentication Unit Tests
 * Tests the 2-legged OAuth flow for automated operations
 */

import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { getServiceAccountAccessToken } from '../../../auth.js';
import { setupTestEnvironment } from '../../helpers/test-utils.js';

describe('Service Account Authentication', () => {
    let env: ReturnType<typeof setupTestEnvironment>;
    const mockFetch = mock.fn();
    
    before(() => {
        env = setupTestEnvironment();
        // @ts-ignore - Mock global fetch
        global.fetch = mockFetch;
    });
    
    after(() => {
        env.restore();
        // @ts-ignore
        delete global.fetch;
    });

    describe('JWT Assertion Creation', () => {
        test('should create valid JWT assertion with required claims', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: true,
                json: async () => ({
                    access_token: 'test-access-token',
                    token_type: 'Bearer',
                    expires_in: 3600
                })
            }));

            const result = await getServiceAccountAccessToken(
                'test-client-id',
                'test-client-secret',
                'test-service-account',
                'test-key-id',
                '-----BEGIN RSA PRIVATE KEY-----\ntest-private-key\n-----END RSA PRIVATE KEY-----',
                ['data:read', 'data:write']
            );

            assert.strictEqual(result.access_token, 'test-access-token');
            assert.strictEqual(result.token_type, 'Bearer');
            assert.strictEqual(result.expires_in, 3600);
            
            // Verify fetch was called with correct parameters
            assert.strictEqual(mockFetch.mock.calls.length, 1);
            const [url, options] = mockFetch.mock.calls[0].arguments;
            assert.strictEqual(url, 'https://developer.api.autodesk.com/authentication/v2/token');
            assert.strictEqual(options.method, 'POST');
            assert.ok(options.body.includes('grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer'));
        });

        test('should include all required scopes in assertion', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: true,
                json: async () => ({
                    access_token: 'test-token',
                    token_type: 'Bearer',
                    expires_in: 3600
                })
            }));

            const scopes = ['data:read', 'data:write', 'data:create', 'data:search'];
            await getServiceAccountAccessToken(
                'client-id',
                'client-secret',
                'service-account',
                'key-id',
                'private-key',
                scopes
            );

            const [, options] = mockFetch.mock.calls[0].arguments;
            const formData = new URLSearchParams(options.body);
            const assertion = formData.get('assertion');
            assert.ok(assertion, 'JWT assertion should be present');
            
            // Decode JWT payload (base64)
            const [, payload] = assertion.split('.');
            const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
            assert.strictEqual(decoded.scope, scopes.join(' '));
        });
    });

    describe('Error Handling', () => {
        test('should handle authentication failure with descriptive error', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: false,
                status: 401,
                text: async () => 'Invalid client credentials'
            }));

            await assert.rejects(
                async () => getServiceAccountAccessToken(
                    'invalid-client',
                    'invalid-secret',
                    'service-id',
                    'key-id',
                    'private-key',
                    ['data:read']
                ),
                {
                    message: /Could not generate access token.*Invalid client credentials/
                }
            );
        });

        test('should handle network errors gracefully', async () => {
            mockFetch.mockImplementation(async () => {
                throw new Error('Network error: Connection timeout');
            });

            await assert.rejects(
                async () => getServiceAccountAccessToken(
                    'client-id',
                    'client-secret',
                    'service-id',
                    'key-id',
                    'private-key',
                    ['data:read']
                ),
                {
                    message: /Network error: Connection timeout/
                }
            );
        });

        test('should validate required parameters', async () => {
            await assert.rejects(
                async () => getServiceAccountAccessToken(
                    '',
                    'secret',
                    'service-id',
                    'key-id',
                    'private-key',
                    ['data:read']
                ),
                {
                    message: /Client ID is required/
                }
            );

            await assert.rejects(
                async () => getServiceAccountAccessToken(
                    'client-id',
                    '',
                    'service-id',
                    'key-id',
                    'private-key',
                    ['data:read']
                ),
                {
                    message: /Client secret is required/
                }
            );
        });

        test('should handle malformed JWT response', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: true,
                json: async () => ({
                    // Missing required fields
                    token: 'malformed-response'
                })
            }));

            await assert.rejects(
                async () => getServiceAccountAccessToken(
                    'client-id',
                    'client-secret',
                    'service-id',
                    'key-id',
                    'private-key',
                    ['data:read']
                ),
                {
                    message: /Invalid token response/
                }
            );
        });
    });

    describe('Token Expiration Handling', () => {
        test('should calculate token expiration correctly', async () => {
            const now = Date.now();
            mockFetch.mockImplementation(async () => ({
                ok: true,
                json: async () => ({
                    access_token: 'test-token',
                    token_type: 'Bearer',
                    expires_in: 3600 // 1 hour
                })
            }));

            const result = await getServiceAccountAccessToken(
                'client-id',
                'client-secret',
                'service-id',
                'key-id',
                'private-key',
                ['data:read']
            );

            // Verify token has expiration time set correctly
            assert.ok(result.expires_at);
            const expectedExpiration = now + (3600 * 1000);
            const actualExpiration = new Date(result.expires_at).getTime();
            
            // Allow for small time difference due to execution
            assert.ok(
                Math.abs(actualExpiration - expectedExpiration) < 1000,
                'Token expiration should be approximately 1 hour from now'
            );
        });
    });

    describe('Scope Validation', () => {
        test('should accept valid Autodesk scopes', async () => {
            mockFetch.mockImplementation(async () => ({
                ok: true,
                json: async () => ({
                    access_token: 'test-token',
                    token_type: 'Bearer',
                    expires_in: 3600
                })
            }));

            const validScopes = [
                ['data:read'],
                ['data:read', 'data:write'],
                ['data:read', 'data:write', 'data:create', 'data:search'],
                ['account:read', 'account:write'],
                ['user:read', 'user:write']
            ];

            for (const scopes of validScopes) {
                const result = await getServiceAccountAccessToken(
                    'client-id',
                    'client-secret',
                    'service-id',
                    'key-id',
                    'private-key',
                    scopes
                );
                assert.ok(result.access_token, `Should accept scopes: ${scopes.join(', ')}`);
            }
        });

        test('should reject empty scopes array', async () => {
            await assert.rejects(
                async () => getServiceAccountAccessToken(
                    'client-id',
                    'client-secret',
                    'service-id',
                    'key-id',
                    'private-key',
                    []
                ),
                {
                    message: /At least one scope is required/
                }
            );
        });
    });
});
