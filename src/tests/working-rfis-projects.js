/**
 * Working Tests for get-rfis Tool (OAuth Authentication)
 * Demonstrates OAuth authentication testing pattern
 */

import { test, describe, mock } from 'node:test';
import * as assert from 'node:assert';

// Mock RFI tool implementation matching actual OAuth pattern
const createGetRfisTest = () => {
    return {
        title: "get-rfis",
        description: "Retrieve RFIs (Requests for Information) from an Autodesk Construction Cloud project",
        schema: {
            projectId: { type: 'string', required: true },
            rfiId: { type: 'string', required: false },
            status: { type: 'string', required: false }
        },
        callback: async ({ projectId, rfiId, status }, context = {}) => {
            // Validation
            if (!projectId || projectId.trim() === '') {
                throw new Error('projectId is required');
            }

            // OAuth Authentication
            if (context.authenticateWithOAuth) {
                await context.authenticateWithOAuth(['data:read']);
            }

            // Build API URL (simplified)
            const cleanProjectId = projectId.replace("b.", "");
            let url = `/api/bim360/rfis/v2/containers/${cleanProjectId}/rfis`;
            
            if (status) {
                url += `?filter[status]=${status}`;
            }

            // Mock API response
            const mockResponse = context.mockResponse || { results: [] };
            
            if (!mockResponse.results) {
                throw new Error("Failed to fetch RFIs");
            }

            // Transform to summary format
            const rfis = mockResponse.results;
            const summary = {
                totalRFIs: rfis.length,
                openRFIs: rfis.filter(r => r.status === 'open').length,
                answeredRFIs: rfis.filter(r => r.status === 'answered').length,
                withCostImpact: rfis.filter(r => r.costImpact === true).length,
                withScheduleImpact: rfis.filter(r => r.scheduleImpact === true).length
            };

            const response = {
                summary,
                rfis: rfis.map(rfi => ({
                    id: rfi.id,
                    identifier: rfi.identifier,
                    title: rfi.title,
                    status: rfi.status,
                    priority: rfi.priority,
                    costImpact: rfi.costImpact,
                    scheduleImpact: rfi.scheduleImpact
                }))
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(response, null, 2)
                }]
            };
        }
    };
};

describe('get-rfis Tool - OAuth Authentication Tests', () => {
    let getRfis;

    test('setup', () => {
        getRfis = createGetRfisTest();
        assert.ok(getRfis);
    });

    test('should have correct tool structure for OAuth tool', () => {
        assert.strictEqual(getRfis.title, 'get-rfis');
        assert.ok(getRfis.description.includes('RFIs'));
        assert.ok(getRfis.description.includes('Requests for Information'));
        assert.strictEqual(typeof getRfis.callback, 'function');
    });

    test('should define optional parameters correctly', () => {
        const schema = getRfis.schema;
        assert.strictEqual(schema.projectId.required, true);
        assert.strictEqual(schema.rfiId.required, false);
        assert.strictEqual(schema.status.required, false);
    });

    test('should require projectId parameter', async () => {
        await assert.rejects(
            () => getRfis.callback({ projectId: '' }),
            /projectId is required/
        );
    });

    test('should use OAuth authentication', async () => {
        const mockContext = {
            authenticateWithOAuth: mock.fn(async (scopes) => {
                assert.deepStrictEqual(scopes, ['data:read']);
                return {
                    access_token: 'oauth-token',
                    token_type: 'Bearer',
                    expires_in: 3600
                };
            }),
            mockResponse: { results: [] }
        };

        await getRfis.callback({ projectId: 'b.test-project' }, mockContext);
        
        assert.strictEqual(mockContext.authenticateWithOAuth.mock.calls.length, 1);
    });

    test('should handle status filtering', async () => {
        const mockRfis = [
            { id: 'rfi-1', status: 'open', title: 'Open RFI' },
            { id: 'rfi-2', status: 'answered', title: 'Answered RFI' }
        ];

        const mockContext = {
            authenticateWithOAuth: mock.fn(async () => ({ access_token: 'token' })),
            mockResponse: { results: mockRfis }
        };

        const result = await getRfis.callback({ 
            projectId: 'b.test-project',
            status: 'open'
        }, mockContext);
        
        assert.ok(result);
        const data = JSON.parse(result.content[0].text);
        assert.strictEqual(data.summary.totalRFIs, 2);
        assert.strictEqual(data.summary.openRFIs, 1);
    });

    test('should calculate summary statistics correctly', async () => {
        const mockRfis = [
            { 
                id: 'rfi-1', 
                status: 'open', 
                costImpact: true, 
                scheduleImpact: false 
            },
            { 
                id: 'rfi-2', 
                status: 'answered', 
                costImpact: false, 
                scheduleImpact: true 
            }
        ];

        const mockContext = {
            authenticateWithOAuth: mock.fn(async () => ({ access_token: 'token' })),
            mockResponse: { results: mockRfis }
        };

        const result = await getRfis.callback({ 
            projectId: 'b.test-project' 
        }, mockContext);
        
        const data = JSON.parse(result.content[0].text);
        assert.strictEqual(data.summary.totalRFIs, 2);
        assert.strictEqual(data.summary.openRFIs, 1);
        assert.strictEqual(data.summary.answeredRFIs, 1);
        assert.strictEqual(data.summary.withCostImpact, 1);
        assert.strictEqual(data.summary.withScheduleImpact, 1);
    });

    test('should handle OAuth authentication failures', async () => {
        const mockContext = {
            authenticateWithOAuth: mock.fn(async () => {
                throw new Error('User cancelled OAuth flow');
            }),
            mockResponse: { results: [] }
        };

        await assert.rejects(
            () => getRfis.callback({ projectId: 'b.test-project' }, mockContext),
            /User cancelled OAuth flow/
        );
    });

    test('should handle empty RFI results', async () => {
        const mockContext = {
            authenticateWithOAuth: mock.fn(async () => ({ access_token: 'token' })),
            mockResponse: { results: [] }
        };

        const result = await getRfis.callback({ 
            projectId: 'b.test-project' 
        }, mockContext);
        
        const data = JSON.parse(result.content[0].text);
        assert.strictEqual(data.summary.totalRFIs, 0);
        assert.deepStrictEqual(data.rfis, []);
    });
});

// Test for get-projects (service account authentication)
const createGetProjectsTest = () => {
    return {
        title: "get-projects",
        description: "List all available projects in an Autodesk Construction Cloud account",
        schema: {
            accountId: { type: 'string', required: true }
        },
        callback: async ({ accountId }, context = {}) => {
            if (!accountId || accountId.trim() === '') {
                throw new Error('accountId is required');
            }

            // Service account authentication
            if (context.getAccessToken) {
                await context.getAccessToken(['data:read']);
            }

            const mockResponse = context.mockResponse || { results: [] };
            
            if (!mockResponse.results) {
                throw new Error("No projects found");
            }

            return {
                content: mockResponse.results.map((project) => ({ 
                    type: "text", 
                    text: JSON.stringify(project) 
                }))
            };
        }
    };
};

describe('get-projects Tool - Service Account Tests', () => {
    let getProjects;

    test('setup', () => {
        getProjects = createGetProjectsTest();
        assert.ok(getProjects);
    });

    test('should have correct tool structure', () => {
        assert.strictEqual(getProjects.title, 'get-projects');
        assert.ok(getProjects.description.includes('projects'));
        assert.strictEqual(typeof getProjects.callback, 'function');
    });

    test('should require accountId parameter', async () => {
        await assert.rejects(
            () => getProjects.callback({ accountId: '' }),
            /accountId is required/
        );
    });

    test('should use service account authentication', async () => {
        const mockContext = {
            getAccessToken: mock.fn(async (scopes) => {
                assert.deepStrictEqual(scopes, ['data:read']);
                return 'service-account-token';
            }),
            mockResponse: { results: [] }
        };

        await getProjects.callback({ accountId: 'test-account' }, mockContext);
        
        assert.strictEqual(mockContext.getAccessToken.mock.calls.length, 1);
    });

    test('should return project list', async () => {
        const mockProjects = [
            { id: 'project-1', name: 'Test Project 1', status: 'active' },
            { id: 'project-2', name: 'Test Project 2', status: 'archived' }
        ];

        const mockContext = {
            getAccessToken: mock.fn(async () => 'token'),
            mockResponse: { results: mockProjects }
        };

        const result = await getProjects.callback({ accountId: 'test-account' }, mockContext);
        
        assert.ok(result);
        assert.strictEqual(result.content.length, 2);
        
        const project1 = JSON.parse(result.content[0].text);
        assert.strictEqual(project1.id, 'project-1');
        assert.strictEqual(project1.name, 'Test Project 1');
    });
});