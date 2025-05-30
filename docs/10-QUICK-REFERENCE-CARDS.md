# Quick Reference Cards - ACC API Cheat Sheet

## Authentication Quick Reference

### 2-Legged Token (App Access)
```bash
curl -X POST "https://developer.api.autodesk.com/authentication/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=account:read account:write"
```

### 3-Legged Token (User Access)
```bash
# Step 1: Authorization URL
https://developer.api.autodesk.com/authentication/v2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK&scope=data:read data:write

# Step 2: Exchange code for token
curl -X POST "https://developer.api.autodesk.com/authentication/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&code=AUTH_CODE&redirect_uri=YOUR_CALLBACK"
```

## Common Endpoints Quick Reference

| Service | Method | Endpoint | Auth Type | Key Parameters |
|---------|--------|----------|-----------|----------------|
| **Accounts** | GET | `/construction/admin/v1/accounts` | 2LO | - |
| **Projects** | GET | `/construction/admin/v1/accounts/{accountId}/projects` | 2LO | - |
| **Project Users** | GET | `/construction/admin/v1/projects/{projectId}/users` | 2LO | `page[limit]`, `page[offset]` |
| **Issues List** | GET | `/construction/issues/v1/projects/{projectId}/issues` | 3LO | `filter[status]`, `page[limit]`, `include` |
| **Issue Create** | POST | `/construction/issues/v1/projects/{projectId}/issues` | 3LO | Body: `{title, issueTypeId, status}` |
| **Issue Types** | GET | `/construction/issues/v1/projects/{projectId}/issue-types` | 3LO | `include=subtypes` |
| **RFIs List** | GET | `/construction/rfis/v2/projects/{projectId}/rfis` | 3LO | `filter[status]`, `include` |
| **RFI Create** | POST | `/construction/rfis/v2/projects/{projectId}/rfis` | 3LO | Body: `{subject, question, assignedTo}` |
| **Submittals List** | GET | `/construction/submittals/v1/projects/{projectId}/items` | 3LO | `filter[status]`, `include` |
| **Submittal Create** | POST | `/construction/submittals/v1/projects/{projectId}/items` | 3LO | Body: `{name, packageId, status}` |
| **Forms List** | GET | `/construction/forms/v1/projects/{projectId}/forms` | 3LO | `filter[status]`, `filter[location]` |

## Status Values Quick Reference

### Issues
```javascript
const ISSUE_STATUSES = {
  DRAFT: 'draft',
  OPEN: 'open', 
  IN_PROGRESS: 'in_progress',
  CLOSED: 'closed',
  VOID: 'void'
};

const ISSUE_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};
```

### RFIs
```javascript
const RFI_STATUSES = {
  OPEN: 'open',
  ANSWERED: 'answered',
  CLOSED: 'closed',
  VOID: 'void'
};
```

### Submittals
```javascript
const SUBMITTAL_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CLOSED: 'closed'
};
```

### Forms
```javascript
const FORM_STATUSES = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
  DISCARDED: 'discarded'
};
```

## Rate Limits Quick Reference

| API Service | GET Requests/min | POST Requests/min | Notes |
|-------------|------------------|-------------------|-------|
| Issues | 100 | 50 | Enterprise: 200/100 |
| RFIs | 100 | 30 | Response creation: 20/min |
| Submittals | 100 | 20 | Write API: 20 items/min |
| Forms | 100 | 30 | Location filters may ignore limits |
| Files | 60 | 15 | Search: 20/min |
| Admin | 30 | 20 | User mgmt: 30/min |

## Error Codes Quick Reference

| Status | Code | Description | Retry? | Action |
|--------|------|-------------|---------|---------|
| 400 | `VALIDATION_ERROR` | Bad request/invalid data | No | Fix request payload |
| 401 | `AUTH_FAILED` | Invalid/expired token | Yes | Refresh token |
| 403 | `PERMISSION_DENIED` | Insufficient permissions | No | Check user access |
| 404 | `NOT_FOUND` | Resource doesn't exist | No | Verify resource ID |
| 429 | `RATE_LIMITED` | Too many requests | Yes | Wait and retry |
| 500 | `SERVER_ERROR` | Internal server error | Yes | Retry with backoff |

## HTTP Headers Quick Reference

### Request Headers
```javascript
const REQUEST_HEADERS = {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'YourApp/1.0'
};
```

### Response Headers to Monitor
```javascript
const IMPORTANT_RESPONSE_HEADERS = {
  'X-RateLimit-Limit': 'Maximum requests allowed',
  'X-RateLimit-Remaining': 'Requests remaining',
  'X-RateLimit-Reset': 'Reset timestamp',
  'Retry-After': 'Seconds to wait (429 errors)'
};
```

## Common Query Parameters

### Pagination (Most APIs)
```javascript
const PAGINATION_PARAMS = {
  'page[limit]': '1-200',     // Items per page
  'page[offset]': '0',        // Starting position
  'page[number]': '1',        // Page number (Data Mgmt API)
  'page[size]': '50'          // Page size (Data Mgmt API)
};
```

### Filtering
```javascript
const FILTER_PARAMS = {
  'filter[status]': 'open,closed',
  'filter[created_at]': 'gte:2024-01-01',
  'filter[updated_at]': 'lte:2024-12-31',
  'filter[assignee]': 'user-uuid'
};
```

### Inclusion
```javascript
const INCLUDE_PARAMS = {
  'include': 'attachments,comments,linkedDocuments,subtypes'
};
```

## JavaScript Code Snippets

### Basic API Request
```javascript
async function makeACCRequest(endpoint, options = {}) {
  const response = await fetch(`https://developer.api.autodesk.com${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}
```

### Error Handling Template
```javascript
async function handleACCRequest(requestFn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (error.status === 401 && i < retries - 1) {
        await refreshToken();
        continue;
      }
      
      throw error;
    }
  }
}
```

### Pagination Helper
```javascript
async function getAllPages(apiCall, pageSize = 100) {
  const results = [];
  let offset = 0;
  
  while (true) {
    const response = await apiCall({ 
      'page[limit]': pageSize, 
      'page[offset]': offset 
    });
    
    results.push(...response.results);
    
    if (response.results.length < pageSize) break;
    offset += pageSize;
  }
  
  return results;
}
```

## Data Validation Patterns

### Project ID Validation
```javascript
function validateProjectId(projectId) {
  const pattern = /^b\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!pattern.test(projectId)) {
    throw new Error('Invalid project ID format');
  }
  return projectId;
}
```

### Date Validation
```javascript
function validateDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format - use ISO 8601');
  }
  return date.toISOString();
}
```

## Common Issue Patterns and Fixes

### Issue: Forms API Pagination Not Working
```javascript
// Workaround for Forms API pagination issues
async function getAllFormsWorkaround(projectId) {
  const forms = [];
  let offset = 0;
  
  while (true) {
    const response = await fetch(`/construction/forms/v1/projects/${projectId}/forms?page[limit]=200&page[offset]=${offset}`);
    const data = await response.json();
    
    if (!data.results?.length) break;
    forms.push(...data.results);
    
    if (data.results.length < 200) break;
    offset += 200;
  }
  
  return forms;
}
```

### Issue: Missing Issue Subtypes
```javascript
// ALWAYS include subtypes parameter
async function getIssueTypesWithSubtypes(projectId) {
  const response = await fetch(
    `/construction/issues/v1/projects/${projectId}/issue-types?include=subtypes`
  );
  return response.json();
}
```

### Issue: Submittal Custom Identifiers
```javascript
// Validate custom identifier before creating submittal
async function createSubmittalSafely(projectId, itemData) {
  // Get next available identifier if needed
  if (!itemData.customIdentifier) {
    const nextIdResponse = await fetch(
      `/construction/submittals/v1/projects/${projectId}/items:next-custom-identifier`
    );
    const { customIdentifier } = await nextIdResponse.json();
    itemData.customIdentifier = customIdentifier;
  }
  
  // Validate identifier
  const validateResponse = await fetch(
    `/construction/submittals/v1/projects/${projectId}/items:validate-custom-identifier`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customIdentifier: itemData.customIdentifier })
    }
  );
  
  if (!validateResponse.ok) {
    throw new Error('Invalid custom identifier');
  }
  
  // Create item
  return fetch(`/construction/submittals/v1/projects/${projectId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
}
```

## Environment Variables Template

```bash
# Authentication
ACC_CLIENT_ID=your_client_id_here
ACC_CLIENT_SECRET=your_client_secret_here

# API Configuration  
ACC_BASE_URL=https://developer.api.autodesk.com
ACC_TIMEOUT=30000

# Rate Limiting
ACC_RATE_LIMIT_REQUESTS=90
ACC_RATE_LIMIT_WINDOW=60000

# Caching
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=false
ENABLE_RESPONSE_LOGGING=false

# Security
TOKEN_ENCRYPTION_KEY=your_encryption_key_here
```

## Testing Checklist

### Pre-deployment Testing
- [ ] Authentication works for both 2LO and 3LO
- [ ] Rate limiting is properly handled
- [ ] Error responses are correctly parsed
- [ ] Pagination works across different APIs
- [ ] Required fields validation is in place
- [ ] Network timeouts are handled
- [ ] Token refresh works automatically

### API-Specific Testing
- [ ] Issues: Test with/without subtypes parameter
- [ ] RFIs: Test response creation workflow
- [ ] Submittals: Test custom identifier validation
- [ ] Forms: Test location-based filtering
- [ ] Files: Test large folder listings

## Performance Optimization Checklist

- [ ] Connection pooling enabled
- [ ] HTTP keep-alive configured  
- [ ] Response compression enabled
- [ ] Caching strategy implemented
- [ ] Request deduplication in place
- [ ] Batch operations where possible
- [ ] Circuit breaker for external calls
- [ ] Monitoring and alerting configured

## Security Checklist

- [ ] Tokens encrypted at rest
- [ ] No credentials in logs
- [ ] Input validation on all endpoints
- [ ] HTTPS only communication
- [ ] Token rotation implemented
- [ ] Rate limiting prevents abuse
- [ ] Error messages don't leak info
- [ ] Dependencies regularly updated

## Monitoring Metrics to Track

```javascript
const KEY_METRICS = {
  // Performance
  response_time_p95: 'Response time 95th percentile',
  request_rate: 'Requests per minute',
  error_rate: 'Percentage of failed requests',
  
  // Rate Limiting
  rate_limit_utilization: 'Percentage of rate limit used',
  rate_limit_violations: 'Number of 429 errors',
  
  // Business Metrics
  issues_created_per_day: 'Daily issue creation rate',
  rfis_resolution_time: 'Average RFI response time',
  submittal_approval_rate: 'Percentage of approved submittals'
};
```

## Common Scopes by Use Case

```javascript
const SCOPE_COMBINATIONS = {
  // Read-only access
  READ_ONLY: 'account:read data:read',
  
  // Full project management
  PROJECT_MANAGER: 'account:read account:write data:read data:write',
  
  // Construction team
  FIELD_TEAM: 'data:read data:write',
  
  // Admin operations
  ADMIN: 'account:read account:write user-profile:read',
  
  // File management
  DOCUMENT_MANAGER: 'data:read data:write data:create data:search'
};
```

## URL Patterns Quick Reference

```javascript
const URL_PATTERNS = {
  // Account & Admin (2-Legged)
  accounts: '/construction/admin/v1/accounts',
  projects: '/construction/admin/v1/accounts/{accountId}/projects',
  projectUsers: '/construction/admin/v1/projects/{projectId}/users',
  
  // Issues (3-Legged)
  issues: '/construction/issues/v1/projects/{projectId}/issues',
  issueTypes: '/construction/issues/v1/projects/{projectId}/issue-types',
  issueComments: '/construction/issues/v1/projects/{projectId}/issues/{issueId}/comments',
  
  // RFIs (3-Legged)
  rfis: '/construction/rfis/v2/projects/{projectId}/rfis',
  rfiResponses: '/construction/rfis/v2/projects/{projectId}/rfis/{rfiId}/responses',
  
  // Submittals (3-Legged)
  submittals: '/construction/submittals/v1/projects/{projectId}/items',
  submittalSpecs: '/construction/submittals/v1/projects/{projectId}/specs',
  submittalPackages: '/construction/submittals/v1/projects/{projectId}/packages',
  
  // Forms (3-Legged)
  forms: '/construction/forms/v1/projects/{projectId}/forms',
  formTemplates: '/construction/forms/v1/projects/{projectId}/templates',
  
  // Files (3-Legged)
  topFolders: '/project/v1/hubs/{hubId}/projects/{projectId}/topFolders',
  folderContents: '/project/v1/hubs/{hubId}/projects/{projectId}/folders/{folderId}/contents',
  itemVersions: '/project/v1/hubs/{hubId}/projects/{projectId}/items/{itemId}/versions'
};
```

This quick reference should serve as a handy cheat sheet during development and troubleshooting of ACC MCP server tools.
