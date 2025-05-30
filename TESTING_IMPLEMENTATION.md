# Testing Implementation Guide

*Practical implementation guide for ACC MCP Server testing*  
*Version: 1.0*  
*Last Updated: May 29, 2025*

## 🚀 **Quick Start**

### **Running Tests**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
node --test src/tests/unit/tools/get-issues.test.ts

# Run with coverage
node --test --experimental-test-coverage src/tests/**/*.test.ts
```

---

## 🏗️ **Test Implementation Examples**

### **1. Unit Test Implementation**

#### **Tool Schema Validation Test**
```typescript
// src/tests/unit/tools/get-issues.test.ts
import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { getIssues } from '../../../tools/get-issues.js';
import { createMockContext } from '../../helpers/mock-context.js';

describe('Tool: get-issues', () => {
    describe('Schema Validation', () => {
        test('should require projectId parameter', async () => {
            const context = createMockContext();
            
            await assert.rejects(
                async () => getIssues.callback({}, context),
                /projectId.*required/
            );
        });

        test('should validate projectId format', async () => {
            const context = createMockContext();
            
            await assert.rejects(
                async () => getIssues.callback({ projectId: '123' }, context),
                /Invalid project ID format/
            );
        });

        test('should accept valid projectId', async () => {
            const context = createMockContext();
            mock.method(context.auth, 'getAccessToken', async () => ({
                access_token: 'mock-token',
                token_type: 'Bearer',
                expires_in: 3600
            }));
            
            const result = await getIssues.callback({ 
                projectId: 'b.871ee5fd-e16f-47d9-8b73-9613637d1dac' 
            }, context);
            
            assert.ok(result);
        });
    });
});
```

#### **Authentication Unit Test**
```typescript
// src/tests/unit/auth/service-account.test.ts
import { test, describe, before, mock } from 'node:test';
import assert from 'node:assert';
import { getServiceAccountAccessToken } from '../../../auth.js';

describe('Service Account Authentication', () => {
    const mockFetch = mock.fn();
    
    before(() => {
        global.fetch = mockFetch;
    });

    test('should create valid JWT assertion', async () => {
        mockFetch.mockImplementation(async () => ({
            ok: true,
            json: async () => ({
                access_token: 'test-token',
                token_type: 'Bearer',
                expires_in: 3600
            })
        }));

        const result = await getServiceAccountAccessToken(
            'client-id',
            'client-secret',
            'service-account-id',
            'key-id',
            'private-key',
            ['data:read']
        );

        assert.strictEqual(result.access_token, 'test-token');
        assert.strictEqual(mockFetch.mock.calls.length, 1);
        
        const [url, options] = mockFetch.mock.calls[0].arguments;
        assert.strictEqual(url, 'https://developer.api.autodesk.com/authentication/v2/token');
        assert.ok(options.body.includes('grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer'));
    });

    test('should handle authentication errors', async () => {
        mockFetch.mockImplementation(async () => ({
            ok: false,
            text: async () => 'Invalid credentials'
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
            /Could not generate access token/
        );
    });
});
```

#### **Response Transformation Test**
```typescript
// src/tests/unit/tools/transformers/issue-transformer.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { transformIssueResponse } from '../../../../tools/common.js';
import { mockIssueApiResponse } from '../../../fixtures/responses/issues.js';

describe('Issue Response Transformer', () => {
    test('should transform API response to tool format', () => {
        const transformed = transformIssueResponse(mockIssueApiResponse);
        
        assert.strictEqual(transformed.summary.totalIssues, 5);
        assert.strictEqual(transformed.summary.openIssues, 3);
        assert.strictEqual(transformed.summary.overdueIssues, 1);
        assert.ok(Array.isArray(transformed.issues));
        assert.strictEqual(transformed.issues.length, 5);
    });

    test('should calculate status breakdown correctly', () => {
        const transformed = transformIssueResponse(mockIssueApiResponse);
        const openStatus = transformed.statusBreakdown.find(s => s.status === 'open');
        
        assert.strictEqual(openStatus.count, 3);
        assert.strictEqual(openStatus.percentage, 60);
    });

    test('should handle empty response', () => {
        const transformed = transformIssueResponse({ results: [] });
        
        assert.strictEqual(transformed.summary.totalIssues, 0);
        assert.deepStrictEqual(transformed.issues, []);
    });
});
```

---

### **2. Integration Test Implementation**

#### **API Integration Test**
```typescript
// src/tests/integration/api/autodesk-api.test.ts
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createMockServer } from '../../helpers/mock-server.js';
import { AutodeskApiClient } from '../../../utils/api-client.js';

describe('Autodesk API Integration', () => {
    let mockServer;
    let apiClient;
    
    before(async () => {
        mockServer = await createMockServer();
        apiClient = new AutodeskApiClient(mockServer.url);
    });
    
    after(async () => {
        await mockServer.close();
    });

    test('should handle API rate limiting', async () => {
        mockServer.setRateLimit(true);
        
        const promises = Array(10).fill(null).map(() => 
            apiClient.getIssues('project-id')
        );
        
        const results = await Promise.allSettled(promises);
        const rateLimited = results.filter(r => 
            r.status === 'rejected' && 
            r.reason.message.includes('rate limit')
        );
        
        assert.ok(rateLimited.length > 0);
    });

    test('should retry on temporary failures', async () => {
        let attempts = 0;
        mockServer.setResponseHandler(() => {
            attempts++;
            if (attempts < 3) {
                return { status: 503, body: 'Service Unavailable' };
            }
            return { status: 200, body: { results: [] } };
        });
        
        const result = await apiClient.getIssues('project-id');
        assert.strictEqual(attempts, 3);
        assert.deepStrictEqual(result.results, []);
    });
});
```

#### **OAuth Flow Integration Test**
```typescript
// src/tests/integration/auth/oauth-flow.test.ts
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { authenticateWithOAuth } from '../../../auth.js';
import { createOAuthMockServer } from '../../helpers/oauth-mock.js';

describe('OAuth Authentication Flow', () => {
    let oauthServer;
    
    before(async () => {
        oauthServer = await createOAuthMockServer();
        process.env.OAUTH_REDIRECT_URI = `${oauthServer.url}/callback`;
    });
    
    after(async () => {
        await oauthServer.close();
    });

    test('should complete 3-legged OAuth flow', async () => {
        const scopes = ['data:read', 'data:write'];
        const tokenPromise = authenticateWithOAuth(scopes);
        
        // Simulate user authorization
        await oauthServer.simulateUserAuthorization();
        
        const token = await tokenPromise;
        assert.ok(token.access_token);
        assert.strictEqual(token.token_type, 'Bearer');
        assert.ok(token.expires_in > 0);
    });

    test('should handle user denial', async () => {
        const tokenPromise = authenticateWithOAuth(['data:read']);
        
        // Simulate user denial
        await oauthServer.simulateUserDenial();
        
        await assert.rejects(
            tokenPromise,
            /User denied authorization/
        );
    });
});
```

---

### **3. End-to-End Test Implementation**

#### **Construction Workflow E2E Test**
```typescript
// src/tests/e2e/scenarios/issue-management-workflow.test.ts
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { MCPTestClient } from '../../helpers/mcp-client.js';
import { TestDataGenerator } from '../../helpers/test-data.js';

describe('E2E: Issue Management Workflow', () => {
    let client;
    let testData;
    
    before(async () => {
        client = new MCPTestClient();
        testData = new TestDataGenerator();
        await client.connect();
    });
    
    after(async () => {
        await testData.cleanup();
        await client.disconnect();
    });

    test('should complete full issue lifecycle', async () => {
        // 1. Get test project
        const { projectId } = await testData.getTestProject();
        
        // 2. List existing issues
        const initialIssues = await client.callTool('get-issues', { projectId });
        const initialCount = initialIssues.summary.totalIssues;
        
        // 3. Get issue types for categorization
        const issueTypes = await client.callTool('get-issue-types', { projectId });
        const safetyType = issueTypes.find(t => t.title === 'Safety');
        assert.ok(safetyType, 'Safety issue type should exist');
        
        // 4. Get root causes for analysis
        const rootCauses = await client.callTool('get-issue-root-causes', { projectId });
        assert.ok(rootCauses.length > 0, 'Root causes should be available');
        
        // 5. Verify issue count (would create issue if API supported it)
        const finalIssues = await client.callTool('get-issues', { projectId });
        assert.ok(finalIssues.summary.totalIssues >= initialCount);
    });
});
```

#### **Document Management E2E Test**
```typescript
// src/tests/e2e/scenarios/document-workflow.test.ts
describe('E2E: Document Management Workflow', () => {
    test('should browse and access project documents', async () => {
        // 1. Get project folder structure
        const folders = await client.callTool('get-folder-contents', {
            accountId: testData.accountId,
            projectId: testData.projectId
        });
        
        assert.ok(folders.data.length > 0, 'Project should have folders');
        
        // 2. Navigate to specific folder
        const projectFilesFolder = folders.data.find(f => 
            f.attributes.displayName === 'Project Files'
        );
        assert.ok(projectFilesFolder, 'Project Files folder should exist');
        
        // 3. Get folder contents
        const files = await client.callTool('get-project-files', {
            projectId: testData.projectId,
            folderId: projectFilesFolder.id
        });
        
        // 4. Check file versions
        if (files.items.length > 0) {
            const firstFile = files.items[0];
            const versions = await client.callTool('get-item-versions', {
                projectId: testData.projectId,
                itemId: firstFile.id
            });
            
            assert.ok(versions.data.length > 0, 'File should have at least one version');
        }
    });
});
```

---

## 🛠️ **Test Helpers & Utilities**

### **Mock Context Creator**
```typescript
// src/tests/helpers/mock-context.js
export function createMockContext(overrides = {}) {
    return {
        auth: {
            getAccessToken: mock.fn(async () => ({
                access_token: 'mock-token',
                token_type: 'Bearer',
                expires_in: 3600
            }))
        },
        logger: {
            info: mock.fn(),
            error: mock.fn(),
            warn: mock.fn(),
            debug: mock.fn()
        },
        ...overrides
    };
}
```

### **Mock Server Implementation**
```typescript
// src/tests/helpers/mock-server.js
import { createServer } from 'node:http';

export async function createMockServer() {
    const responses = new Map();
    let rateLimit = false;
    
    const server = createServer((req, res) => {
        if (rateLimit && Math.random() > 0.5) {
            res.statusCode = 429;
            res.end('Rate limit exceeded');
            return;
        }
        
        const handler = responses.get(`${req.method} ${req.url}`);
        if (handler) {
            const response = handler(req);
            res.statusCode = response.status || 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response.body));
        } else {
            res.statusCode = 404;
            res.end('Not found');
        }
    });
    
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    
    return {
        url: `http://localhost:${port}`,
        setResponse: (method, path, handler) => {
            responses.set(`${method} ${path}`, handler);
        },
        setRateLimit: (enabled) => {
            rateLimit = enabled;
        },
        close: () => new Promise(resolve => server.close(resolve))
    };
}
```

### **Test Data Generator**
```typescript
// src/tests/helpers/test-data.js
export class TestDataGenerator {
    constructor() {
        this.createdItems = [];
    }
    
    async getTestProject() {
        // Return consistent test project for E2E tests
        return {
            accountId: process.env.TEST_ACCOUNT_ID || 'test-account',
            projectId: process.env.TEST_PROJECT_ID || 'b.test-project-id',
            projectName: 'E2E Test Project'
        };
    }
    
    generateIssue(overrides = {}) {
        return {
            id: `issue-${Date.now()}`,
            title: 'Test Issue',
            status: 'open',
            issueType: 'Quality',
            priority: 'Normal',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            ...overrides
        };
    }
    
    async cleanup() {
        // Clean up any created test data
        for (const item of this.createdItems) {
            await this.deleteItem(item);
        }
    }
}
```

---

## 📦 **Mock Data Fixtures**

### **Issue Response Fixture**
```typescript
// src/tests/fixtures/responses/issues.js
export const mockIssueApiResponse = {
    results: [
        {
            id: 'issue-1',
            title: 'Safety barrier missing at entrance',
            status: 'open',
            issueType: 'Safety',
            priority: 'High',
            dueDate: '2025-06-01T00:00:00Z',
            createdAt: '2025-05-25T10:00:00Z',
            assignedTo: 'user-1',
            rootCauseId: 'rc-001'
        },
        {
            id: 'issue-2', 
            title: 'Concrete strength test results pending',
            status: 'open',
            issueType: 'Quality',
            priority: 'Normal',
            dueDate: '2025-06-15T00:00:00Z',
            createdAt: '2025-05-26T14:30:00Z'
        },
        // ... more test issues
    ],
    pagination: {
        offset: 0,
        limit: 100,
        totalResults: 5
    }
};
```

### **Folder Structure Fixture**
```typescript
// src/tests/fixtures/responses/folders.js
export const mockFolderResponse = {
    data: [
        {
            type: 'folders',
            id: 'urn:adsk.wipprod:fs.folder:co.abc123',
            attributes: {
                name: 'Project Files',
                displayName: 'Project Files',
                createTime: '2025-01-15T10:00:00Z',
                createUserId: 'user-1',
                lastModifiedTime: '2025-05-28T15:30:00Z',
                lastModifiedUserId: 'user-2',
                objectCount: 42,
                extension: {
                    type: 'folders:autodesk.bim360:Folder',
                    version: '1.0'
                }
            }
        },
        // ... more folders
    ]
};
```

---

## 🔧 **Test Configuration**

### **Test Environment Variables**
```bash
# .env.test
TEST_ACCOUNT_ID=test-account-id
TEST_PROJECT_ID=b.test-project-id
TEST_USER_ID=test-user-id
MOCK_SERVER_PORT=3456
TEST_TIMEOUT=30000
```

### **Test Runner Configuration**
```javascript
// test.config.js
export default {
    files: ['src/tests/**/*.test.ts'],
    timeout: 30000,
    concurrency: 1, // Run tests sequentially for integration tests
    only: false, // Set to true to run only tests marked with test.only
    watch: {
        files: ['src/**/*.ts'],
        ignore: ['node_modules', 'build']
    }
};
```

---

## 🎯 **Testing Best Practices**

### **1. Test Naming Convention**
```typescript
// Good: Descriptive, explains what and expected outcome
test('should return 403 when user lacks project permissions', async () => {});

// Bad: Vague, doesn't explain the scenario
test('permission test', async () => {});
```

### **2. Test Data Isolation**
```typescript
describe('Issue Tests', () => {
    let testIssue;
    
    beforeEach(() => {
        // Create fresh test data for each test
        testIssue = generateTestIssue();
    });
    
    afterEach(() => {
        // Clean up test data
        cleanupTestIssue(testIssue);
    });
});
```

### **3. Assertion Messages**
```typescript
// Good: Provides context on failure
assert.ok(
    response.data.length > 0,
    `Expected at least one folder in project, but got ${response.data.length}`
);

// Bad: No context
assert.ok(response.data.length > 0);
```

### **4. Async Test Handling**
```typescript
// Good: Proper async/await usage
test('should handle async operations', async () => {
    const result = await asyncOperation();
    assert.strictEqual(result.status, 'success');
});

// Bad: Missing await
test('should handle async operations', () => {
    const result = asyncOperation(); // Missing await!
    assert.strictEqual(result.status, 'success');
});
```

---

## 📊 **Coverage Reporting**

### **Generate Coverage Report**
```bash
# Run tests with coverage
node --test --experimental-test-coverage src/tests/**/*.test.ts

# Generate HTML coverage report
c8 node --test src/tests/**/*.test.ts
c8 report --reporter=html
```

### **Coverage Configuration**
```json
// .c8rc.json
{
    "all": true,
    "include": ["src/**/*.ts"],
    "exclude": [
        "src/tests/**",
        "src/**/*.test.ts",
        "src/types/**"
    ],
    "reporter": ["text", "lcov", "html"],
    "lines": 80,
    "functions": 80,
    "branches": 80,
    "statements": 80
}
```

---

## 🚀 **Next Steps**

1. **Implement Unit Tests**: Start with tool schema validation
2. **Add Integration Tests**: Focus on authentication flows
3. **Create E2E Tests**: Implement critical user workflows
4. **Set Up CI/CD**: Configure GitHub Actions
5. **Monitor Coverage**: Track and improve test coverage

---

*This implementation guide provides the foundation for comprehensive testing of the ACC MCP Server.*
