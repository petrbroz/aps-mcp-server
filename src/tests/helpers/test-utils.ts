/**
 * Test Utilities for ACC MCP Server
 * Provides common testing functionality and helpers
 */

import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { Tool } from '../../tools/common.js';

/**
 * Custom assertion helpers for construction management specific validations
 */
export const assertValidTool = (tool: Tool<any>) => {
    assert.ok(tool.title, 'Tool must have a title');
    assert.ok(tool.description, 'Tool must have a description');
    assert.ok(tool.schema, 'Tool must have a schema');
    assert.ok(typeof tool.callback === 'function', 'Tool must have a callback function');
    
    // Validate title format (kebab-case)
    assert.match(tool.title, /^[a-z]+(-[a-z]+)*$/, 'Tool title must be in kebab-case');
    
    // Validate description length
    assert.ok(tool.description.length >= 10, 'Tool description must be at least 10 characters');
};

/**
 * Assert that a response follows the MCP content format
 */
export const assertValidMCPResponse = (response: any) => {
    assert.ok(response, 'Response must exist');
    assert.ok(Array.isArray(response.content), 'Response must have content array');
    response.content.forEach((item: any, index: number) => {
        assert.strictEqual(item.type, 'text', `Content item ${index} must be of type 'text'`);
        assert.ok(typeof item.text === 'string', `Content item ${index} must have text property`);
    });
};

/**
 * Create a mock access token for testing
 */
export const createMockAccessToken = (expiresIn: number = 3600): string => {
    return 'mock_access_token_' + Date.now();
};

/**
 * Mock API response builder for consistent test data
 */
export class MockResponseBuilder {
    private response: any = {};

    constructor(baseResponse?: any) {
        this.response = baseResponse || {};
    }

    withData(data: any): MockResponseBuilder {
        this.response.data = data;
        return this;
    }

    withResults(results: any[]): MockResponseBuilder {
        this.response.results = results;
        return this;
    }

    withPagination(offset: number, limit: number, total: number): MockResponseBuilder {
        this.response.pagination = {
            offset,
            limit,
            totalResults: total
        };
        return this;
    }

    withError(code: string, message: string): MockResponseBuilder {
        this.response.error = {
            code,
            message
        };
        return this;
    }

    build(): any {
        return { ...this.response };
    }
}

/**
 * Test context for setting up common test scenarios
 */
export interface TestContext {
    mockAccessToken: string;
    mockAccountId: string;
    mockProjectId: string;
    mockUserId: string;
}

/**
 * Create a standard test context for construction management scenarios
 */
export const createTestContext = (): TestContext => {
    return {
        mockAccessToken: createMockAccessToken(),
        mockAccountId: 'b.test-account-id',
        mockProjectId: 'b.test-project-id',
        mockUserId: 'test-user-id'
    };
};

/**
 * Mock timer for testing time-dependent functionality
 */
export class MockTimer {
    private currentTime: number;

    constructor(initialTime: number = Date.now()) {
        this.currentTime = initialTime;
    }

    advance(milliseconds: number): void {
        this.currentTime += milliseconds;
    }

    getCurrentTime(): number {
        return this.currentTime;
    }
}

/**
 * Assert that an error matches expected properties
 */
export const assertError = (error: any, expectedMessage?: string | RegExp, expectedCode?: string) => {
    assert.ok(error instanceof Error, 'Error must be an Error instance');
    
    if (expectedMessage) {
        if (expectedMessage instanceof RegExp) {
            assert.match(error.message, expectedMessage, 'Error message must match pattern');
        } else {
            assert.strictEqual(error.message, expectedMessage, 'Error message must match');
        }
    }
    
    if (expectedCode && 'code' in error) {
        assert.strictEqual(error.code, expectedCode, 'Error code must match');
    }
};

/**
 * Construction-specific test data generators
 */
export const TestDataGenerators = {
    /**
     * Generate a mock issue for testing
     */
    createMockIssue: (overrides?: any) => ({
        id: 'issue-' + Date.now(),
        title: 'Test Issue',
        description: 'Test issue description',
        status: 'open',
        priority: 'medium',
        assignedTo: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides
    }),

    /**
     * Generate a mock RFI for testing
     */
    createMockRFI: (overrides?: any) => ({
        id: 'rfi-' + Date.now(),
        title: 'Test RFI',
        question: 'Test RFI question',
        status: 'open',
        priority: 'high',
        assignedTo: 'test-user',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        ...overrides
    }),

    /**
     * Generate a mock submittal for testing
     */
    createMockSubmittal: (overrides?: any) => ({
        id: 'submittal-' + Date.now(),
        title: 'Test Submittal',
        description: 'Test submittal description',
        status: 'pending',
        type: 'material',
        submittedBy: 'test-user',
        submittedDate: new Date().toISOString(),
        ...overrides
    }),

    /**
     * Generate a mock file/document for testing
     */
    createMockFile: (overrides?: any) => ({
        id: 'file-' + Date.now(),
        name: 'test-document.pdf',
        size: 1024 * 1024, // 1MB
        mimeType: 'application/pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        ...overrides
    }),

    /**
     * Generate a mock folder for testing
     */
    createMockFolder: (overrides?: any) => ({
        id: 'folder-' + Date.now(),
        name: 'Test Folder',
        type: 'folder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides
    })
};

/**
 * Performance testing utilities
 */
export class PerformanceMonitor {
    private startTime: number = 0;
    private measurements: Map<string, number[]> = new Map();

    start(): void {
        this.startTime = performance.now();
    }

    end(label: string): number {
        const duration = performance.now() - this.startTime;
        
        if (!this.measurements.has(label)) {
            this.measurements.set(label, []);
        }
        
        this.measurements.get(label)!.push(duration);
        return duration;
    }

    getStats(label: string): { min: number; max: number; avg: number; count: number } | null {
        const measurements = this.measurements.get(label);
        if (!measurements || measurements.length === 0) {
            return null;
        }

        return {
            min: Math.min(...measurements),
            max: Math.max(...measurements),
            avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
            count: measurements.length
        };
    }

    assertPerformance(label: string, maxDuration: number): void {
        const stats = this.getStats(label);
        assert.ok(stats, `No measurements found for label: ${label}`);
        assert.ok(stats.avg <= maxDuration, 
            `Average duration ${stats.avg.toFixed(2)}ms exceeds maximum ${maxDuration}ms`);
    }
}

/**
 * Environment setup for tests
 */
export const setupTestEnvironment = () => {
    // Store original env vars
    const originalEnv = { ...process.env };

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.APS_CLIENT_ID = 'test-client-id';
    process.env.APS_CLIENT_SECRET = 'test-client-secret';
    process.env.APS_SA_ID = 'test-sa-id';
    process.env.APS_SA_KEY_ID = 'test-sa-key-id';
    process.env.APS_SA_PRIVATE_KEY = 'test-private-key';

    return {
        restore: () => {
            // Restore original environment
            Object.keys(process.env).forEach(key => delete process.env[key]);
            Object.assign(process.env, originalEnv);
        }
    };
};

/**
 * Async test helper for better error messages
 */
export const asyncTest = (name: string, fn: () => Promise<void>) => {
    return test(name, async () => {
        try {
            await fn();
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Test "${name}" failed:`, error.message);
                console.error('Stack:', error.stack);
            }
            throw error;
        }
    });
};

/**
 * Helper to test tool error handling
 */
export const testToolErrorHandling = async (
    tool: Tool<any>,
    args: any,
    expectedError: string | RegExp
) => {
    try {
        await tool.callback(args);
        assert.fail('Expected tool to throw an error');
    } catch (error) {
        assertError(error, expectedError);
    }
};

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};
