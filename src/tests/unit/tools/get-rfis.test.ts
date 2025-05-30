/**
 * Unit Tests for get-rfis Tool
 * Tests RFI retrieval with OAuth authentication
 */

import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { getRFIs } from '../../../tools/get-rfis.js';
import { createMockContext, assertLoggerCalled } from '../../helpers/mock-context.js';
import { assertValidTool, assertValidMCPResponse, TestDataGenerators } from '../../helpers/test-utils.js';

describe('Tool: get-rfis (OAuth)', () => {
    describe('Tool Structure', () => {
        test('should have valid MCP tool structure', () => {
            assertValidTool(getRFIs);
        });

        test('should have correct metadata', () => {
            assert.strictEqual(getRFIs.title, 'get-rfis');
            assert.ok(getRFIs.description.includes('RFIs'));
            assert.ok(getRFIs.description.includes('Requests for Information'));
            assert.ok(getRFIs.description.includes('construction project communication'));
        });

        test('should define schema with optional parameters', () => {
            const schema = getRFIs.schema;
            assert.ok(schema.properties.projectId);
            assert.ok(schema.required.includes('projectId'));
            
            // Optional parameters
            assert.ok(schema.properties.rfiId);
            assert.ok(schema.properties.status);
            assert.ok(!schema.required.includes('rfiId'));
            assert.ok(!schema.required.includes('status'));
        });
    });

    describe('OAuth Authentication', () => {
        test('should use OAuth authentication instead of service account', async () => {
            const context = createMockContext();
            const mockFetch = mock.fn(async () => ({
                ok: true,
                json: async () => ({ results: [] })
            }));
            
            // @ts-ignore
            global.fetch = mockFetch;
            
            await getRFIs.callback({ projectId: 'b.test-project' }, context);
            
            // Should call OAuth auth, not service account
            assert.strictEqual(context.auth.authenticateWithOAuth.mock.calls.length, 1);
            assert.strictEqual(context.auth.getAccessToken.mock.calls.length, 0);
            
            // Verify OAuth scopes
            assert.deepStrictEqual(
                context.auth.authenticateWithOAuth.mock.calls[0].arguments[0],
                ['data:read']
            );
            
            // @ts-ignore
            delete global.fetch;
        });

        test('should handle OAuth cancellation', async () => {
            const context = createMockContext();
            context.auth.authenticateWithOAuth = mock.fn(async () => {
                throw new Error('User cancelled OAuth flow');
            });
            
            await assert.rejects(
                async () => getRFIs.callback({ projectId: 'b.test-project' }, context),
                {
                    message: /User cancelled OAuth flow/
                }
            );
            
            assertLoggerCalled(context, 'error', /OAuth authentication failed/);
        });
    });

    describe('API Integration', () => {
        test('should call correct BIM360 RFI API endpoint', async () => {
            const context = createMockContext();
            const projectId = 'b.test-project';
            const mockFetch = mock.fn(async (url: string) => {
                assert.ok(url.includes('/api/bim360/rfis/v2/containers/'));
                assert.ok(url.includes('test-project')); // Without b. prefix
                assert.ok(url.includes('/rfis'));
                
                return {
                    ok: true,
                    json: async () => ({ results: [] })
                };
            });
            
            // @ts-ignore
            global.fetch = mockFetch;
            
            await getRFIs.callback({ projectId }, context);
            
            assert.strictEqual(mockFetch.mock.calls.length, 1);
            
            // @ts-ignore
            delete global.fetch;
        });

        test('should handle status filtering', async () => {
            const context = createMockContext();
            const mockFetch = mock.fn(async (url: string) => {
                assert.ok(url.includes('filter[status]=open'), 'Should include status filter');
                
                return {
                    ok: true,
                    json: async () => ({ results: [] })
                };
            });
            
            // @ts-ignore
            global.fetch = mockFetch;
            
            await getRFIs.callback({ 
                projectId: 'b.test-project',
                status: 'open'
            }, context);
            
            assert.strictEqual(mockFetch.mock.calls.length, 1);
            
            // @ts-ignore
            delete global.fetch;
        });
    });

    describe('Response Transformation', () => {
        test('should transform RFI list response', async () => {
            const context = createMockContext();
            const mockRFIs = [
                TestDataGenerators.createMockRFI({
                    id: 'rfi-1',
                    status: 'open',
                    priority: 'high',
                    costImpact: true,
                    scheduleImpact: false
                }),
                TestDataGenerators.createMockRFI({
                    id: 'rfi-2',
                    status: 'answered',
                    priority: 'normal',
                    costImpact: false,
                    scheduleImpact: true
                })
            ];
            
            const mockFetch = mock.fn(async () => ({
                ok: true,
                json: async () => ({ 
                    results: mockRFIs,
                    pagination: {
                        offset: 0,
                        limit: 100,
                        totalResults: 2
                    }
                })
            }));
            
            // @ts-ignore
            global.fetch = mockFetch;
            
            const result = await getRFIs.callback({ 
                projectId: 'b.test-project' 
            }, context);
            
            assertValidMCPResponse(result);
            
            const content = JSON.parse(result.content[0].text);
            
            // Verify summary statistics
            assert.strictEqual(content.summary.totalRFIs, 2);
            assert.strictEqual(content.summary.openRFIs, 1);
            assert.strictEqual(content.summary.answeredRFIs, 1);
            assert.strictEqual(content.summary.withCostImpact, 1);
            assert.strictEqual(content.summary.withScheduleImpact, 1);
            
            // Verify RFI list
            assert.strictEqual(content.rfis.length, 2);
            assert.strictEqual(content.rfis[0].id, 'rfi-1');
            assert.strictEqual(content.rfis[1].id, 'rfi-2');
            
            // @ts-ignore
            delete global.fetch;
        });

    });
});