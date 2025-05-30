# Testing and Troubleshooting Guide - 2025 Edition

## Testing Strategies for ACC API Integration

### Unit Testing Authentication
```javascript
describe('ACCAuthManager', () => {
  let authManager;
  
  beforeEach(() => {
    authManager = new ACCAuthManager(
      process.env.TEST_CLIENT_ID,
      process.env.TEST_CLIENT_SECRET
    );
  });

  test('should fetch 2-legged token successfully', async () => {
    const token = await authManager.get2LeggedToken();
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.startsWith('eyJ')).toBe(true); // JWT format
  });

  test('should cache tokens and reuse unexpired ones', async () => {
    const token1 = await authManager.get2LeggedToken();
    const token2 = await authManager.get2LeggedToken();
    
    expect(token1).toBe(token2);
  });

  test('should refresh expired tokens', async () => {
    // Mock expired token
    authManager.tokens.twoLegged = {
      access_token: 'expired_token',
      expires_at: Date.now() - 1000
    };
    
    const newToken = await authManager.get2LeggedToken();
    expect(newToken).not.toBe('expired_token');
  });
});
```

### Integration Testing with Real ACC APIs
```javascript
describe('Issues API Integration', () => {
  let issuesService;
  let testProjectId;
  
  beforeAll(async () => {
    const authManager = new ACCAuthManager(
      process.env.ACC_CLIENT_ID,
      process.env.ACC_CLIENT_SECRET
    );
    
    issuesService = new IssuesService(authManager);
    testProjectId = process.env.ACC_TEST_PROJECT_ID;
  });

  test('should list issues without errors', async () => {
    const response = await issuesService.listIssues(testProjectId, {
      limit: 10
    });
    
    expect(response).toHaveProperty('results');
    expect(Array.isArray(response.results)).toBe(true);
    expect(response).toHaveProperty('pagination');
  });

  test('should handle pagination correctly', async () => {
    const page1 = await issuesService.listIssues(testProjectId, {
      limit: 5,
      offset: 0
    });
    
    const page2 = await issuesService.listIssues(testProjectId, {
      limit: 5,
      offset: 5
    });
    
    // Ensure different results if there are enough issues
    if (page1.pagination.totalResults > 5) {
      expect(page1.results).not.toEqual(page2.results);
    }
  });

  test('should create and retrieve issue', async () => {
    // Get available issue types first
    const issueTypes = await issuesService.getIssueTypes(testProjectId, true);
    expect(issueTypes.results.length).toBeGreaterThan(0);
    
    const newIssue = await issuesService.createIssue(testProjectId, {
      title: `Test Issue ${Date.now()}`,
      description: 'Automated test issue',
      issueTypeId: issueTypes.results[0].id,
      status: 'draft'
    });
    
    expect(newIssue).toHaveProperty('id');
    expect(newIssue.title).toContain('Test Issue');
    
    // Retrieve the created issue
    const retrievedIssue = await issuesService.getIssue(testProjectId, newIssue.id);
    expect(retrievedIssue.id).toBe(newIssue.id);
    expect(retrievedIssue.title).toBe(newIssue.title);
    
    // Clean up - update to closed status
    await issuesService.updateIssue(testProjectId, newIssue.id, {
      status: 'closed'
    });
  });
});
```

### Load Testing for Rate Limits
```javascript
describe('Rate Limiting Tests', () => {
  let issuesService;
  let testProjectId;
  
  beforeAll(async () => {
    const authManager = new ACCAuthManager(
      process.env.ACC_CLIENT_ID,
      process.env.ACC_CLIENT_SECRET
    );
    
    issuesService = new IssuesService(authManager);
    testProjectId = process.env.ACC_TEST_PROJECT_ID;
  });

  test('should handle rate limits gracefully', async () => {
    const requests = [];
    
    // Make 110 requests rapidly to trigger rate limiting
    for (let i = 0; i < 110; i++) {
      requests.push(
        issuesService.listIssues(testProjectId, { limit: 1 })
          .catch(error => ({ error: error.message }))
      );
    }
    
    const results = await Promise.all(requests);
    
    const successCount = results.filter(r => !r.error).length;
    const rateLimitErrors = results.filter(r => 
      r.error && r.error.includes('429')
    ).length;
    
    expect(successCount).toBeGreaterThan(0);
    expect(rateLimitErrors).toBeGreaterThan(0);
  }, 30000);
});
```

## Common Issues and Solutions

### Authentication Issues

#### Issue: "Invalid Client" Error
**Symptoms:**
```json
{
  "error": "invalid_client",
  "error_description": "The client credentials are invalid"
}
```

**Causes and Solutions:**
1. **Wrong Client ID/Secret**: Verify credentials in Autodesk Developer Portal
2. **App Not Provisioned**: Ensure app is added to target ACC account
3. **Callback URL Mismatch**: Check redirect URI matches exactly (case sensitive)

**Diagnostic Steps:**
```javascript
async function diagnoseAuthIssue(clientId, clientSecret) {
  console.log('Testing authentication...');
  
  try {
    const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'account:read'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Authentication failed:', error);
      
      if (error.error === 'invalid_client') {
        console.log('Solutions:');
        console.log('1. Verify client ID and secret in developer portal');
        console.log('2. Check if app is provisioned for target account');
        console.log('3. Ensure app has "Autodesk Construction Cloud" API access');
      }
    } else {
      console.log('Authentication successful!');
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}
```

#### Issue: "Insufficient Scope" Error
**Symptoms:**
```json
{
  "errors": [{
    "status": "403",
    "code": "INSUFFICIENT_SCOPE",
    "detail": "Token does not have required scope"
  }]
}
```

**Solution:**
```javascript
// Check which scopes are required for specific endpoints
const ENDPOINT_SCOPES = {
  '/construction/issues/v1/': ['data:read', 'data:write'],
  '/construction/rfis/v2/': ['data:read', 'data:write'],
  '/construction/submittals/v1/': ['data:read', 'data:write'],
  '/construction/admin/v1/': ['account:read', 'account:write'],
  '/project/v1/': ['data:read']
};

function getRequiredScopes(endpoint) {
  for (const [pattern, scopes] of Object.entries(ENDPOINT_SCOPES)) {
    if (endpoint.includes(pattern)) {
      return scopes;
    }
  }
  return ['data:read']; // Default
}
```

### API-Specific Issues

#### Issue: Forms API Pagination Not Working
**Symptoms:**
- `nextUrl` returns 404
- `limit` parameter ignored
- Inconsistent result counts

**Workaround:**
```javascript
async function getAllFormsWorkaround(projectId, locationIds = []) {
  const forms = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const params = new URLSearchParams({
        'page[limit]': 200, // Use maximum
        'page[offset]': offset
      });
      
      if (locationIds.length > 0) {
        locationIds.forEach(id => params.append('filter[location]', id));
        // When filtering by location, API may return all results at once
      }
      
      const response = await fetch(`/construction/forms/v1/projects/${projectId}/forms?${params}`);
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        hasMore = false;
      } else {
        forms.push(...data.results);
        
        // Special handling for location filtering
        if (locationIds.length > 0) {
          hasMore = false; // Location filtering returns all results
        } else {
          hasMore = data.results.length === 200;
          offset += 200;
        }
      }
    } catch (error) {
      console.warn(`Error at offset ${offset}:`, error.message);
      hasMore = false;
    }
  }
  
  return forms;
}
```

#### Issue: Issue Types Missing Subtypes
**Symptoms:**
- Issue types returned without `subtypes` property
- Subtype data appears empty

**Solution:**
```javascript
// ALWAYS include 'subtypes' parameter
async function getIssueTypesCorrectly(projectId) {
  const response = await fetch(
    `/construction/issues/v1/projects/${projectId}/issue-types?include=subtypes`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  
  // Validate subtypes are present
  data.results.forEach(type => {
    if (!type.subtypes) {
      console.warn(`Issue type ${type.name} missing subtypes - ensure 'include=subtypes' parameter is used`);
    }
  });
  
  return data;
}
```

#### Issue: Submittal Custom Identifiers Not Working
**Symptoms:**
- Custom identifiers not being saved
- Validation endpoint returning errors

**Solution:**
```javascript
async function createSubmittalWithValidation(projectId, itemData) {
  // First, get next available identifier if not provided
  if (!itemData.customIdentifier) {
    const nextId = await fetch(`/construction/submittals/v1/projects/${projectId}/items:next-custom-identifier`);
    const nextIdData = await nextId.json();
    itemData.customIdentifier = nextIdData.customIdentifier;
  }
  
  // Validate identifier before creating
  const validation = await fetch(`/construction/submittals/v1/projects/${projectId}/items:validate-custom-identifier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customIdentifier: itemData.customIdentifier })
  });
  
  if (!validation.ok) {
    const error = await validation.json();
    throw new Error(`Invalid custom identifier: ${error.errors[0].detail}`);
  }
  
  // Now create the item
  return fetch(`/construction/submittals/v1/projects/${projectId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
}
```

### Data Consistency Issues

#### Issue: Stale Data After Updates
**Symptoms:**
- GET requests return old data after successful PATCH
- Cached responses not reflecting changes

**Solution:**
```javascript
class DataConsistencyHandler {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }
  
  async updateWithConsistencyCheck(endpoint, updatePayload, maxRetries = 3) {
    // Perform update
    const updateResponse = await fetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateResponse.ok) {
      throw new Error('Update failed');
    }
    
    const updatedData = await updateResponse.json();
    
    // Clear cache for this resource
    this.clearCacheForResource(endpoint);
    
    // Verify update took effect
    for (let i = 0; i < maxRetries; i++) {
      await this.delay(1000 * (i + 1)); // Increasing delay
      
      const verifyResponse = await fetch(endpoint, { method: 'GET' });
      const currentData = await verifyResponse.json();
      
      if (this.dataMatches(updatedData, currentData)) {
        return currentData;
      }
    }
    
    console.warn('Data consistency check failed - update may not be reflected immediately');
    return updatedData;
  }
  
  dataMatches(expected, actual) {
    // Compare key fields that should match after update
    const keyFields = ['title', 'status', 'description', 'updatedAt'];
    
    for (const field of keyFields) {
      if (expected[field] && expected[field] !== actual[field]) {
        return false;
      }
    }
    
    return true;
  }
  
  clearCacheForResource(endpoint) {
    // Clear related cache entries
    const resourceId = this.extractResourceId(endpoint);
    this.cache.delete(resourceId);
  }
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Testing Tools and Utilities

### Postman Collection Testing
```javascript
// Environment setup for automated testing
const environment = {
  "baseUrl": "https://developer.api.autodesk.com",
  "clientId": "{{CLIENT_ID}}",
  "clientSecret": "{{CLIENT_SECRET}}",
  "testProjectId": "{{TEST_PROJECT_ID}}",
  "accessToken": ""
};

// Pre-request script for authentication
const preRequestScript = `
if (!pm.environment.get("accessToken") || 
    Date.now() > pm.environment.get("tokenExpiresAt")) {
  
  const authRequest = {
    url: pm.environment.get("baseUrl") + "/authentication/v2/token",
    method: 'POST',
    header: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: {
      mode: 'urlencoded',
      urlencoded: [
        {key: 'grant_type', value: 'client_credentials'},
        {key: 'client_id', value: pm.environment.get('clientId')},
        {key: 'client_secret', value: pm.environment.get('clientSecret')},
        {key: 'scope', value: 'account:read account:write data:read data:write'}
      ]
    }
  };
  
  pm.sendRequest(authRequest, (err, response) => {
    if (err) {
      console.log('Auth error:', err);
    } else {
      const responseData = response.json();
      pm.environment.set("accessToken", responseData.access_token);
      pm.environment.set("tokenExpiresAt", Date.now() + (responseData.expires_in * 1000));
    }
  });
}
`;

// Test script template
const testScript = `
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response time is less than 5000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

pm.test("Response has required structure", function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('results');
    pm.expect(responseJson.results).to.be.an('array');
});

pm.test("Rate limit headers present", function () {
    pm.expect(pm.response.headers.get('X-RateLimit-Limit')).to.exist;
    pm.expect(pm.response.headers.get('X-RateLimit-Remaining')).to.exist;
});
`;
```

### Health Check Implementation
```javascript
class ACCHealthChecker {
  constructor(authManager) {
    this.authManager = authManager;
    this.services = {
      issues: '/construction/issues/v1/',
      rfis: '/construction/rfis/v2/',
      submittals: '/construction/submittals/v1/',
      forms: '/construction/forms/v1/',
      files: '/project/v1/',
      admin: '/construction/admin/v1/'
    };
  }
  
  async checkAllServices(projectId) {
    const results = {};
    
    for (const [service, basePath] of Object.entries(this.services)) {
      try {
        const startTime = Date.now();
        await this.checkService(service, basePath, projectId);
        const duration = Date.now() - startTime;
        
        results[service] = {
          status: 'healthy',
          responseTime: duration,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[service] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return results;
  }
  
  async checkService(service, basePath, projectId) {
    const token = await this.authManager.get3LeggedToken();
    let testEndpoint;
    
    switch (service) {
      case 'issues':
        testEndpoint = `${basePath}projects/${projectId}/issue-types`;
        break;
      case 'rfis':
        testEndpoint = `${basePath}projects/${projectId}/rfis?page[limit]=1`;
        break;
      case 'submittals':
        testEndpoint = `${basePath}projects/${projectId}/items?page[limit]=1`;
        break;
      case 'forms':
        testEndpoint = `${basePath}projects/${projectId}/forms?page[limit]=1`;
        break;
      case 'files':
        testEndpoint = `${basePath}hubs/${projectId.replace('b.', '')}/projects/${projectId}/topFolders`;
        break;
      case 'admin':
        const accountToken = await this.authManager.get2LeggedToken();
        const response = await fetch(`https://developer.api.autodesk.com${basePath}accounts`, {
          headers: { 'Authorization': `Bearer ${accountToken}` }
        });
        if (!response.ok) throw new Error(`Admin API unhealthy: ${response.status}`);
        return;
    }
    
    const response = await fetch(`https://developer.api.autodesk.com${testEndpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`${service} API unhealthy: ${response.status}`);
    }
  }
  
  async monitorHealth(projectId, intervalMs = 60000) {
    console.log('Starting health monitoring...');
    
    setInterval(async () => {
      try {
        const health = await this.checkAllServices(projectId);
        const unhealthyServices = Object.entries(health)
          .filter(([, status]) => status.status === 'unhealthy')
          .map(([service]) => service);
        
        if (unhealthyServices.length > 0) {
          console.warn(`Unhealthy services: ${unhealthyServices.join(', ')}`);
          // Send alerts, update monitoring dashboards, etc.
        } else {
          console.log('All services healthy');
        }
      } catch (error) {
        console.error('Health check failed:', error.message);
      }
    }, intervalMs);
  }
}
```

### Debugging Utilities

#### Request/Response Logger
```javascript
class APIDebugger {
  constructor(enableLogging = true) {
    this.enableLogging = enableLogging;
    this.requests = [];
  }
  
  wrapFetch(originalFetch) {
    const self = this;
    
    return async function debugFetch(url, options = {}) {
      const requestId = Date.now();
      const startTime = performance.now();
      
      if (self.enableLogging) {
        console.log(`[${requestId}] REQUEST: ${options.method || 'GET'} ${url}`);
        console.log(`[${requestId}] Headers:`, self.sanitizeHeaders(options.headers));
        if (options.body) {
          console.log(`[${requestId}] Body:`, self.sanitizeBody(options.body));
        }
      }
      
      try {
        const response = await originalFetch(url, options);
        const duration = performance.now() - startTime;
        
        if (self.enableLogging) {
          console.log(`[${requestId}] RESPONSE: ${response.status} ${response.statusText} (${duration.toFixed(2)}ms)`);
          console.log(`[${requestId}] Rate Limit:`, {
            limit: response.headers.get('X-RateLimit-Limit'),
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset')
          });
        }
        
        // Store request info for debugging
        self.requests.push({
          id: requestId,
          url,
          method: options.method || 'GET',
          status: response.status,
          duration,
          timestamp: new Date().toISOString()
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        if (self.enableLogging) {
          console.error(`[${requestId}] ERROR: ${error.message} (${duration.toFixed(2)}ms)`);
        }
        
        self.requests.push({
          id: requestId,
          url,
          method: options.method || 'GET',
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });
        
        throw error;
      }
    };
  }
  
  sanitizeHeaders(headers) {
    if (!headers) return {};
    
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer [REDACTED]';
    }
    return sanitized;
  }
  
  sanitizeBody(body) {
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2).substring(0, 500) + '...';
      } catch {
        return body.substring(0, 500) + '...';
      }
    }
    return body;
  }
  
  getRequestStats() {
    const total = this.requests.length;
    const successful = this.requests.filter(r => !r.error && r.status < 400).length;
    const failed = total - successful;
    const avgDuration = this.requests.reduce((sum, r) => sum + r.duration, 0) / total;
    
    return {
      total,
      successful,
      failed,
      successRate: (successful / total * 100).toFixed(2) + '%',
      averageResponseTime: avgDuration.toFixed(2) + 'ms'
    };
  }
  
  exportRequests() {
    return JSON.stringify(this.requests, null, 2);
  }
}

// Usage
const debugger = new APIDebugger();
const originalFetch = global.fetch;
global.fetch = debugger.wrapFetch(originalFetch);
```

This comprehensive testing and troubleshooting guide should help identify and resolve common issues when developing ACC MCP server tools, providing both preventive testing strategies and reactive debugging approaches.
