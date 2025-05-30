/**
 * Fixed Mock Context Helper for Testing
 * Simplified version that works with actual tool interfaces
 */

import { mock } from 'node:test';

/**
 * Simple mock context for service account tools (like get-issues)
 */
export function createSimpleMockContext(overrides: any = {}) {
    return {
        getAccessToken: mock.fn(async (scopes: string[]) => 'mock-access-token'),
        mockResponse: { results: [] },
        ...overrides
    };
}

/**
 * Mock context for OAuth tools (like get-rfis)
 */
export function createOAuthMockContext(overrides: any = {}) {
    return {
        authenticateWithOAuth: mock.fn(async (scopes: string[]) => ({
            access_token: 'mock-oauth-token',
            token_type: 'Bearer',
            expires_in: 3600
        })),
        mockResponse: { results: [] },
        ...overrides
    };
}

/**
 * Creates test data for various tool types
 */
export const TestData = {
    createMockIssue: (overrides: any = {}) => ({
        id: 'issue-' + Date.now(),
        identifier: 'ISS-001',
        title: 'Test Issue',
        status: 'open',
        priority: 'medium',
        issueType: 'Quality',
        createdAt: new Date().toISOString(),
        ...overrides
    }),

    createMockRFI: (overrides: any = {}) => ({
        id: 'rfi-' + Date.now(),
        identifier: 'RFI-001',
        title: 'Test RFI',
        status: 'open',
        priority: 'high',
        createdAt: new Date().toISOString(),
        ...overrides
    }),

    createMockProject: (overrides: any = {}) => ({
        id: 'b.project-' + Date.now(),
        name: 'Test Project',
        status: 'active',
        ...overrides
    })
};
