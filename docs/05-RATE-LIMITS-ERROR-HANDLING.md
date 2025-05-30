# Rate Limits and Error Handling Guide - 2025 Edition

## Rate Limiting Overview

Autodesk Construction Cloud APIs implement rate limiting to ensure fair usage and maintain service quality. Rate limits vary by endpoint category and authentication type.

## Rate Limit Headers

All API responses include rate limiting information in headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703721600
Retry-After: 60
```

### Header Explanations
- `X-RateLimit-Limit`: Maximum requests allowed in the time window
- `X-RateLimit-Remaining`: Requests remaining in current window  
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (only present on 429 errors)

## Rate Limits by API Category

### Issues API Rate Limits
**Standard Limits:**
- GET requests: 100 requests per minute
- POST/PATCH requests: 50 requests per minute  
- Bulk operations: 10 requests per minute

**Enhanced Limits for Enterprise:**
- GET requests: 200 requests per minute
- POST/PATCH requests: 100 requests per minute

### RFIs API Rate Limits
**Standard Limits:**
- GET requests: 100 requests per minute
- POST requests: 30 requests per minute
- Response creation: 20 requests per minute

### Submittals API Rate Limits  
**Read Operations:**
- GET requests: 100 requests per minute
- List operations: 50 requests per minute

**Write Operations (New in 2024/2025):**
- POST items: 20 requests per minute
- POST specs: 10 requests per minute
- Validation endpoints: 50 requests per minute

### Forms API Rate Limits
**Standard Limits:**
- GET requests: 100 requests per minute
- Form submissions: 30 requests per minute

**Known Issues:**
- Rate limits may not be properly enforced when using location filters
- Bulk form operations may encounter stricter limits

### Data Management API Rate Limits
**File Operations:**
- GET folder contents: 60 requests per minute
- File downloads: 30 requests per minute
- Search operations: 20 requests per minute

**Upload Operations:**
- File uploads: 10 requests per minute
- Version creation: 15 requests per minute

### Admin API Rate Limits
**Account Operations:**
- User management: 30 requests per minute
- Project operations: 20 requests per minute
- Company management: 15 requests per minute

## Error Handling Patterns

### HTTP Status Codes

#### 400 Bad Request
**Common Causes:**
- Missing required fields
- Invalid field values
- Malformed JSON payload
- Invalid query parameters

**Example Response:**
```json
{
  "errors": [
    {
      "status": "400",
      "code": "VALIDATION_ERROR",
      "title": "Bad Request",
      "detail": "The field 'issueTypeId' is required",
      "source": {
        "pointer": "/data/attributes/issueTypeId"
      }
    }
  ]
}
```

**Handling Strategy:**
```javascript
if (response.status === 400) {
  const errorData = await response.json();
  const validationErrors = errorData.errors.map(err => ({
    field: err.source?.pointer?.replace('/data/attributes/', ''),
    message: err.detail
  }));
  
  throw new ValidationError('Request validation failed', validationErrors);
}
```

#### 401 Unauthorized
**Common Causes:**
- Expired access token
- Invalid token
- Missing Authorization header
- Insufficient token scope

**Handling Strategy:**
```javascript
async function handleAuthError(response, authManager) {
  if (response.status === 401) {
    // Clear cached token and retry
    authManager.clearTokenCache();
    const newToken = await authManager.getAccessToken();
    
    // Retry original request with new token
    return retryWithNewToken(originalRequest, newToken);
  }
}
```

#### 403 Forbidden
**Common Causes:**
- User lacks required permissions
- Project access denied
- Wrong authentication type (2LO vs 3LO)
- Account/project not properly provisioned

**Example Response:**
```json
{
  "errors": [
    {
      "status": "403",
      "code": "INSUFFICIENT_PERMISSIONS",
      "title": "Forbidden",
      "detail": "User does not have permission to access this project"
    }
  ]
}
```

#### 404 Not Found
**Common Causes:**
- Invalid project/issue/RFI ID
- Resource has been deleted
- User doesn't have access to resource

#### 429 Too Many Requests
**Common Causes:**
- Rate limit exceeded
- Too many concurrent requests
- Bulk operation limits exceeded

**Example Response:**
```json
{
  "errors": [
    {
      "status": "429",
      "code": "RATE_LIMIT_EXCEEDED", 
      "title": "Too Many Requests",
      "detail": "Rate limit exceeded. Try again later.",
      "meta": {
        "retryAfter": 60,
        "limit": 100,
        "remaining": 0,
        "resetTime": "2024-12-01T15:31:00Z"
      }
    }
  ]
}
```

**Handling Strategy with Exponential Backoff:**
```javascript
async function handleRateLimit(response, retryCount = 0, maxRetries = 3) {
  if (response.status === 429 && retryCount < maxRetries) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    const delay = Math.min(Math.pow(2, retryCount) * 1000, retryAfter * 1000);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOriginalRequest(retryCount + 1);
  }
  
  throw new RateLimitError('Rate limit exceeded and max retries reached');
}
```

#### 500 Internal Server Error
**Common Causes:**
- Temporary server issues
- Service maintenance
- Data corruption or inconsistency

**Handling Strategy:**
```javascript
async function handle500Error(response, retryCount = 0) {
  if (response.status === 500 && retryCount < 3) {
    // Wait with exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOriginalRequest(retryCount + 1);
  }
  
  // Log for support escalation
  logger.error('Server error after retries', { 
    status: response.status,
    endpoint: response.url,
    retryCount 
  });
  
  throw new ServerError('Internal server error');
}
```

## Comprehensive Error Handling Implementation

### Robust Request Handler
```javascript
class ACCApiClient {
  constructor(authManager) {
    this.authManager = authManager;
    this.maxRetries = 3;
  }

  async makeRequest(url, options = {}, retryCount = 0) {
    try {
      // Add authentication
      const token = await this.authManager.getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, { ...options, headers });
      
      // Handle different error types
      if (!response.ok) {
        return await this.handleErrorResponse(response, url, options, retryCount);
      }

      // Monitor rate limit headers
      this.updateRateLimitInfo(response);
      
      return response;
      
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateRetryDelay(retryCount);
        await this.delay(delay);
        return this.makeRequest(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  async handleErrorResponse(response, url, options, retryCount) {
    const errorData = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 400:
        throw new ValidationError(errorData.errors || 'Bad Request');
        
      case 401:
        if (retryCount < this.maxRetries) {
          await this.authManager.refreshToken();
          return this.makeRequest(url, options, retryCount + 1);
        }
        throw new AuthenticationError('Authentication failed');
        
      case 403:
        throw new PermissionError('Insufficient permissions');
        
      case 404:
        throw new NotFoundError('Resource not found');
        
      case 429:
        if (retryCount < this.maxRetries) {
          const retryAfter = response.headers.get('Retry-After') || 60;
          await this.delay(retryAfter * 1000);
          return this.makeRequest(url, options, retryCount + 1);
        }
        throw new RateLimitError('Rate limit exceeded');
        
      case 500:
      case 502:
      case 503:
        if (retryCount < this.maxRetries) {
          const delay = this.calculateRetryDelay(retryCount);
          await this.delay(delay);
          return this.makeRequest(url, options, retryCount + 1);
        }
        throw new ServerError('Server error');
        
      default:
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  calculateRetryDelay(retryCount) {
    // Exponential backoff with jitter
    const baseDelay = Math.pow(2, retryCount) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  updateRateLimitInfo(response) {
    this.rateLimitInfo = {
      limit: parseInt(response.headers.get('X-RateLimit-Limit')) || null,
      remaining: parseInt(response.headers.get('X-RateLimit-Remaining')) || null,
      reset: parseInt(response.headers.get('X-RateLimit-Reset')) || null
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isRetryableError(error) {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND';
  }
}
```

## Rate Limit Management Strategies

### 1. Request Queue with Rate Limiting
```javascript
class RateLimitedQueue {
  constructor(requestsPerMinute = 100) {
    this.queue = [];
    this.requestTimes = [];
    this.requestsPerMinute = requestsPerMinute;
    this.processing = false;
  }

  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      if (!this.canMakeRequest()) {
        await this.waitForRateLimit();
      }
      
      const { requestFn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await requestFn();
        this.recordRequest();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processing = false;
  }

  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old request times
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    
    return this.requestTimes.length < this.requestsPerMinute;
  }

  recordRequest() {
    this.requestTimes.push(Date.now());
  }

  async waitForRateLimit() {
    const oldestRequest = this.requestTimes[0];
    const waitTime = 60000 - (Date.now() - oldestRequest);
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

### 2. Adaptive Rate Limiting
```javascript
class AdaptiveRateLimiter {
  constructor() {
    this.currentLimit = 100; // Start with conservative limit
    this.successCount = 0;
    this.errorCount = 0;
    this.lastAdjustment = Date.now();
  }

  async makeRequest(requestFn) {
    const startTime = Date.now();
    
    try {
      const result = await requestFn();
      this.recordSuccess();
      return result;
    } catch (error) {
      if (error.status === 429) {
        this.recordRateLimit();
        throw error;
      }
      this.recordError();
      throw error;
    }
  }

  recordSuccess() {
    this.successCount++;
    
    // Gradually increase limit if we're consistently successful
    if (this.successCount > 50 && Date.now() - this.lastAdjustment > 300000) {
      this.currentLimit = Math.min(this.currentLimit * 1.1, 200);
      this.lastAdjustment = Date.now();
      this.successCount = 0;
    }
  }

  recordRateLimit() {
    // Aggressively reduce limit on rate limit errors
    this.currentLimit = Math.max(this.currentLimit * 0.5, 10);
    this.lastAdjustment = Date.now();
    this.errorCount++;
  }

  recordError() {
    this.errorCount++;
    
    // Slightly reduce limit on general errors
    if (this.errorCount > 10) {
      this.currentLimit = Math.max(this.currentLimit * 0.9, 20);
      this.errorCount = 0;
    }
  }
}
```

## Best Practices for Error Handling

### 1. Implement Circuit Breaker Pattern
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 2. Comprehensive Logging
```javascript
class APILogger {
  static logRequest(url, method, headers, body) {
    console.log(`[API Request] ${method} ${url}`, {
      timestamp: new Date().toISOString(),
      headers: this.sanitizeHeaders(headers),
      body: this.sanitizeBody(body)
    });
  }

  static logResponse(url, status, headers, duration) {
    console.log(`[API Response] ${status} ${url}`, {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      rateLimit: {
        limit: headers.get('X-RateLimit-Limit'),
        remaining: headers.get('X-RateLimit-Remaining'),
        reset: headers.get('X-RateLimit-Reset')
      }
    });
  }

  static logError(error, context) {
    console.error(`[API Error]`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      status: error.status,
      url: context.url,
      method: context.method,
      retryCount: context.retryCount
    });
  }

  static sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer [REDACTED]';
    }
    return sanitized;
  }

  static sanitizeBody(body) {
    // Remove sensitive information from logged request bodies
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return this.sanitizeObject(parsed);
      } catch {
        return '[UNPARSEABLE]';
      }
    }
    return this.sanitizeObject(body);
  }

  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = ['password', 'secret', 'token', 'key'];
    const sanitized = { ...obj };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
```

### 3. Health Check Implementation
```javascript
class APIHealthChecker {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.healthStatus = {
      issues: 'unknown',
      rfis: 'unknown', 
      submittals: 'unknown',
      files: 'unknown'
    };
  }

  async checkHealth() {
    const checks = [
      this.checkIssuesAPI(),
      this.checkRFIsAPI(),
      this.checkSubmittalsAPI(),
      this.checkFilesAPI()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      const service = ['issues', 'rfis', 'submittals', 'files'][index];
      this.healthStatus[service] = result.status === 'fulfilled' ? 'healthy' : 'unhealthy';
    });

    return this.healthStatus;
  }

  async checkIssuesAPI() {
    // Make a lightweight request to test the service
    await this.apiClient.get('/construction/issues/v1/projects/test/issue-types');
  }

  async checkRFIsAPI() {
    await this.apiClient.get('/construction/rfis/v2/projects/test/rfis?page[limit]=1');
  }

  async checkSubmittalsAPI() {
    await this.apiClient.get('/construction/submittals/v1/projects/test/items?page[limit]=1');
  }

  async checkFilesAPI() {
    await this.apiClient.get('/project/v1/hubs/test/projects/test/topFolders');
  }
}
```

## Known Issues and Workarounds

### 1. Forms API Pagination Issues
**Issue**: `nextUrl` doesn't work properly, `limit` parameter ignored with location filters
**Workaround**: 
```javascript
async function getAllForms(projectId, locationIds = []) {
  const forms = [];
  let offset = 0;
  const limit = locationIds.length > 0 ? 200 : 100; // Use max limit
  
  while (true) {
    const params = new URLSearchParams({
      'page[limit]': limit,
      'page[offset]': offset
    });
    
    if (locationIds.length > 0) {
      // Note: limit may be ignored, so we get all results
      locationIds.forEach(id => params.append('filter[location]', id));
    }
    
    const response = await apiClient.get(`/construction/forms/v1/projects/${projectId}/forms?${params}`);
    const data = await response.json();
    
    forms.push(...data.results);
    
    if (data.results.length < limit) break;
    offset += limit;
  }
  
  return forms;
}
```

### 2. Issue Types Subtypes Missing
**Issue**: Subtypes not returned unless explicitly requested
**Workaround**:
```javascript
async function getIssueTypesWithSubtypes(projectId) {
  // MUST include 'subtypes' parameter
  const response = await apiClient.get(`/construction/issues/v1/projects/${projectId}/issue-types?include=subtypes`);
  return response.json();
}
```

### 3. Project Users API Pagination Problems
**Issue**: Pagination headers may be inconsistent
**Workaround**:
```javascript
async function getAllProjectUsers(projectId) {
  const users = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    try {
      const response = await apiClient.get(`/construction/admin/v1/projects/${projectId}/users?page[limit]=${limit}&page[offset]=${offset}`);
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) break;
      
      users.push(...data.results);
      
      // Check for proper pagination info, fallback to result count
      const totalResults = data.pagination?.totalResults;
      if (totalResults && users.length >= totalResults) break;
      if (data.results.length < limit) break;
      
      offset += limit;
    } catch (error) {
      if (error.status === 404) break; // No more results
      throw error;
    }
  }
  
  return users;
}
```

This comprehensive error handling guide should help minimize API integration issues and provide robust error recovery mechanisms for your MCP server tools.
