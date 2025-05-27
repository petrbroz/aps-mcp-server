import { test, describe } from 'node:test';
import assert from 'node:assert';

// Import tools to test
import { getAccounts } from '../tools/get-accounts.js';
import { getProjects } from '../tools/get-projects.js';

describe('ACC MCP Server - Tool Tests', () => {
    describe('Tool Schema Validation', () => {
        test('getAccounts should have correct schema', () => {
            assert.strictEqual(typeof getAccounts.title, 'string');
            assert.strictEqual(typeof getAccounts.description, 'string');
            assert.strictEqual(typeof getAccounts.callback, 'function');
            assert.strictEqual(typeof getAccounts.schema, 'object');
        });

        test('getProjects should have correct schema', () => {
            assert.strictEqual(typeof getProjects.title, 'string');
            assert.strictEqual(typeof getProjects.description, 'string');
            assert.strictEqual(typeof getProjects.callback, 'function');
            assert.strictEqual(typeof getProjects.schema, 'object');
        });
    });

    describe('Tool Metadata', () => {
        test('all tools should have required MCP metadata', () => {
            const tools = [getAccounts, getProjects];
            
            for (const tool of tools) {
                assert.ok(tool.title, `${tool.title} should have a title`);
                assert.ok(tool.description, `${tool.title} should have a description`);
                assert.ok(tool.callback, `${tool.title} should have a callback function`);
                assert.ok(tool.schema, `${tool.title} should have a schema`);
            }
        });
    });
});

// Mock test for authentication (without making real API calls)
describe('Authentication Tests', () => {
    test('environment variables should be loaded', async () => {
        // Import config after setting test environment
        const config = await import('../config.js');
        
        // In test environment, we expect these to be defined
        assert.ok(config.APS_CLIENT_ID, 'APS_CLIENT_ID should be defined');
        assert.ok(config.APS_CLIENT_SECRET, 'APS_CLIENT_SECRET should be defined');
    });
});