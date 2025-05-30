/**
 * Unit Tests for get-issues Tool
 * Tests issue retrieval, filtering, and transformation
 */

import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { getIssues } from '../../../tools/get-issues.js';
import { createMockContext, assertLoggerCalled } from '../../helpers/mock-context.js';
import { assertValidTool, assertValidMCPResponse, TestDataGenerators } from '../../helpers/test-utils.js';

describe('Tool: get-issues', () => {
    describe('Tool Structure', () => {
        test('should have valid MCP tool structure', () => {
            assertValidTool(getIssues);
        });

        test('should have correct metadata', () => {
            assert.strictEqual(getIssues.title, 'get-issues');
            assert.ok(getIssues.description.includes('issues'));
            assert.ok(getIssues.description.includes('Autodesk Construction Cloud'));
        });

        test('should define required parameters in schema', () => {
            const schema = getIssues.schema;
            assert.ok(schema.properties.projectId);
            assert.ok(schema.required.includes('projectId'));
            assert.strictEqual(schema.properties.projectId.type, 'string');
        });
    });

    describe('Parameter Validation', () => {
        test('should require projectId parameter', async () => {
            const context = createMockContext();
            
            await assert.rejects(
                async () => getIssues.callback({}, context),
                {
                    message: /projectId is required/
                }
            );
        });

        test('should validate projectId format', async () => {
            const context = createMockContext();
            
            // Test invalid format
            await assert.rejects(
                async () => getIssues.callback({ projectId: '123' }, context),
                {
                    message: /Invalid project ID format/
                }
            );
            
            // Test empty string
            await assert.rejects(
                async () => getIssues.callback({ projectId: '' }, context),
                {
                    message: /projectId is required/
                }
            );
        });

        test('should accept valid projectId formats', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => ({ results: [] }))
            };
            
            // Mock the API client
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            // Valid format with b. prefix
            const result = await getIssues.callback({ 
                projectId: 'b.1234567890abcdef' 
            }, context);
            
            assert.ok(result);
            assertValidMCPResponse(result);
        });
    });

    describe('API Integration', () => {
        test('should strip b. prefix when calling Issues API', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async (containerId: string) => {
                    assert.strictEqual(containerId, '1234567890abcdef', 'Should strip b. prefix');
                    return { results: [] };
                })
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            await getIssues.callback({ 
                projectId: 'b.1234567890abcdef' 
            }, context);
            
            assert.strictEqual(mockClient.getIssues.mock.calls.length, 1);
        });

        test('should handle API authentication', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => ({ results: [] }))
            };
            
            mock.method(global, 'IssuesClient', function(credentials: any) {
                assert.strictEqual(credentials.access_token, 'mock-access-token');
                assert.strictEqual(credentials.token_type, 'Bearer');
                return mockClient;
            });
            
            await getIssues.callback({ 
                projectId: 'b.test-project' 
            }, context);
            
            // Verify auth was called with correct scopes
            assert.strictEqual(context.auth.getAccessToken.mock.calls.length, 1);
            assert.deepStrictEqual(
                context.auth.getAccessToken.mock.calls[0].arguments[0],
                ['data:read']
            );
        });
    });

    describe('Response Transformation', () => {
        test('should transform API response to MCP format', async () => {
            const context = createMockContext();
            const mockIssues = [
                TestDataGenerators.createMockIssue({
                    id: 'issue-1',
                    status: 'open',
                    issueType: 'Safety',
                    priority: 'High'
                }),
                TestDataGenerators.createMockIssue({
                    id: 'issue-2',
                    status: 'closed',
                    issueType: 'Quality',
                    priority: 'Normal'
                })
            ];
            
            const mockClient = {
                getIssues: mock.fn(async () => ({ 
                    results: mockIssues,
                    pagination: {
                        offset: 0,
                        limit: 100,
                        totalResults: 2
                    }
                }))
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            const result = await getIssues.callback({ 
                projectId: 'b.test-project' 
            }, context);
            
            assertValidMCPResponse(result);
            
            // Parse the response
            const content = JSON.parse(result.content[0].text);
            
            // Verify summary
            assert.strictEqual(content.summary.totalIssues, 2);
            assert.strictEqual(content.summary.openIssues, 1);
            assert.strictEqual(content.summary.closedIssues, 1);
            
            // Verify issues array
            assert.strictEqual(content.issues.length, 2);
            assert.strictEqual(content.issues[0].id, 'issue-1');
            assert.strictEqual(content.issues[1].id, 'issue-2');
            
            // Verify status breakdown
            assert.ok(content.statusBreakdown);
            const openStatus = content.statusBreakdown.find((s: any) => s.status === 'open');
            assert.strictEqual(openStatus.count, 1);
            assert.strictEqual(openStatus.percentage, 50);
        });

        test('should calculate overdue issues correctly', async () => {
            const context = createMockContext();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            
            const mockIssues = [
                TestDataGenerators.createMockIssue({
                    status: 'open',
                    dueDate: yesterday // Overdue
                }),
                TestDataGenerators.createMockIssue({
                    status: 'open',
                    dueDate: tomorrow // Not overdue
                }),
                TestDataGenerators.createMockIssue({
                    status: 'closed',
                    dueDate: yesterday // Closed, not counted as overdue
                })
            ];
            
            const mockClient = {
                getIssues: mock.fn(async () => ({ 
                    results: mockIssues,
                    pagination: { offset: 0, limit: 100, totalResults: 3 }
                }))
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            const result = await getIssues.callback({ 
                projectId: 'b.test-project' 
            }, context);
            
            const content = JSON.parse(result.content[0].text);
            assert.strictEqual(content.summary.overdueIssues, 1);
        });

        test('should handle empty response gracefully', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => ({ 
                    results: [],
                    pagination: { offset: 0, limit: 100, totalResults: 0 }
                }))
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            const result = await getIssues.callback({ 
                projectId: 'b.test-project' 
            }, context);
            
            const content = JSON.parse(result.content[0].text);
            assert.strictEqual(content.summary.totalIssues, 0);
            assert.strictEqual(content.summary.openIssues, 0);
            assert.strictEqual(content.summary.overdueIssues, 0);
            assert.deepStrictEqual(content.issues, []);
        });
    });

    describe('Error Handling', () => {
        test('should handle API errors gracefully', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => {
                    throw new Error('API Error: Rate limit exceeded');
                })
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            await assert.rejects(
                async () => getIssues.callback({ projectId: 'b.test-project' }, context),
                {
                    message: /Failed to fetch issues.*Rate limit exceeded/
                }
            );
            
            // Verify error was logged
            assertLoggerCalled(context, 'error', /Error fetching issues/);
        });

        test('should handle authentication failures', async () => {
            const context = createMockContext();
            context.auth.getAccessToken = mock.fn(async () => {
                throw new Error('Authentication failed: Invalid credentials');
            });
            
            await assert.rejects(
                async () => getIssues.callback({ projectId: 'b.test-project' }, context),
                {
                    message: /Authentication failed/
                }
            );
        });

        test('should handle malformed API responses', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => ({
                    // Missing required fields
                    data: []
                }))
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            await assert.rejects(
                async () => getIssues.callback({ projectId: 'b.test-project' }, context),
                {
                    message: /Invalid API response/
                }
            );
        });

        test('should handle network timeouts', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => {
                    const error = new Error('Request timeout');
                    error.code = 'ETIMEDOUT';
                    throw error;
                })
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            await assert.rejects(
                async () => getIssues.callback({ projectId: 'b.test-project' }, context),
                {
                    message: /Request timeout/
                }
            );
        });
    });

    describe('Logging', () => {
        test('should log issue retrieval process', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => ({ 
                    results: [TestDataGenerators.createMockIssue()],
                    pagination: { offset: 0, limit: 100, totalResults: 1 }
                }))
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            await getIssues.callback({ projectId: 'b.test-project' }, context);
            
            // Verify info logs
            assertLoggerCalled(context, 'info', /Fetching issues for project/);
            assertLoggerCalled(context, 'info', /Found 1 issue/);
        });

        test('should log warnings for potential issues', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => ({ 
                    results: [],
                    pagination: { offset: 0, limit: 100, totalResults: 0 }
                }))
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            await getIssues.callback({ projectId: 'b.test-project' }, context);
            
            // Verify warning for no issues
            assertLoggerCalled(context, 'warn', /No issues found/);
        });
    });

    describe('Performance', () => {
        test('should complete within acceptable time', async () => {
            const context = createMockContext();
            const mockClient = {
                getIssues: mock.fn(async () => {
                    // Simulate API delay
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return { 
                        results: Array(100).fill(null).map((_, i) => 
                            TestDataGenerators.createMockIssue({ id: `issue-${i}` })
                        ),
                        pagination: { offset: 0, limit: 100, totalResults: 100 }
                    };
                })
            };
            
            mock.method(global, 'IssuesClient', function() {
                return mockClient;
            });
            
            const startTime = Date.now();
            await getIssues.callback({ projectId: 'b.test-project' }, context);
            const duration = Date.now() - startTime;
            
            // Should complete within 2 seconds even with API delay
            assert.ok(duration < 2000, `Operation took ${duration}ms, should be under 2000ms`);
        });
    });
});
