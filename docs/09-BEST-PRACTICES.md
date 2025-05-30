# Development Best Practices and Architectural Guidance - 2025 Edition

## Architectural Principles

### 1. Separation of Concerns
```javascript
// Good: Separate authentication, API calls, and business logic
class ACCMCPServer {
  constructor() {
    this.authManager = new AuthenticationManager();
    this.apiClient = new ACCAPIClient(this.authManager);
    this.toolsManager = new ToolsManager(this.apiClient);
    this.errorHandler = new ErrorHandler();
  }
}

// Avoid: Mixing concerns in a single class
class BadACCServer {
  async getIssues(projectId) {
    // Authentication logic mixed with business logic
    const token = await this.getTokenSomehow();
    const issues = await fetch(url, { headers: { Authorization: token }});
    // Data transformation mixed with API calls
    return issues.map(issue => this.transformIssue(issue));
  }
}
```

### 2. Dependency Injection for Testability
```javascript
class IssuesService {
  constructor(apiClient, logger, cache) {
    this.apiClient = apiClient;
    this.logger = logger;
    this.cache = cache;
  }
  
  async listIssues(projectId, filters = {}) {
    this.logger.debug('Fetching issues', { projectId, filters });
    
    const cacheKey = `issues:${projectId}:${JSON.stringify(filters)}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached issues', { count: cached.length });
      return cached;
    }
    
    const issues = await this.apiClient.get(`/construction/issues/v1/projects/${projectId}/issues`, {
      params: filters
    });
    
    await this.cache.set(cacheKey, issues, 300); // 5 minutes
    return issues;
  }
}

// Testable setup
const mockApiClient = new MockACCAPIClient();
const mockLogger = new MockLogger();
const mockCache = new MockCache();
const issuesService = new IssuesService(mockApiClient, mockLogger, mockCache);
```

### 3. Configuration Management
```javascript
class ACCConfiguration {
  constructor() {
    this.config = {
      // Authentication
      clientId: process.env.ACC_CLIENT_ID,
      clientSecret: process.env.ACC_CLIENT_SECRET,
      
      // API Configuration
      baseUrl: process.env.ACC_BASE_URL || 'https://developer.api.autodesk.com',
      timeout: parseInt(process.env.ACC_TIMEOUT) || 30000,
      
      // Rate Limiting
      rateLimits: {
        issues: { requests: 90, window: 60000 }, // 90 requests per minute
        rfis: { requests: 80, window: 60000 },
        submittals: { requests: 70, window: 60000 },
        forms: { requests: 85, window: 60000 }
      },
      
      // Retry Configuration
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        retryableStatuses: [429, 500, 502, 503, 504]
      },
      
      // Caching
      cache: {
        defaultTTL: 300, // 5 minutes
        maxSize: 1000,
        enableCompression: true
      },
      
      // Logging
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
        enableResponseLogging: process.env.ENABLE_RESPONSE_LOGGING === 'true'
      }
    };
    
    this.validate();
  }
  
  validate() {
    const required = ['clientId', 'clientSecret'];
    const missing = required.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
  
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }
}
```

## Error Handling Best Practices

### 1. Comprehensive Error Classification
```javascript
class ACCError extends Error {
  constructor(message, code, status, details = {}) {
    super(message);
    this.name = 'ACCError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class ACCErrorFactory {
  static createFromResponse(response, body) {
    const status = response.status;
    
    switch (status) {
      case 400:
        return new ACCError(
          'Bad Request',
          'INVALID_REQUEST',
          400,
          { validation: body.errors }
        );
      case 401:
        return new ACCError(
          'Authentication Failed',
          'AUTH_FAILED',
          401,
          { tokenExpired: true }
        );
      case 403:
        return new ACCError(
          'Insufficient Permissions',
          'PERMISSION_DENIED',
          403,
          { requiredScopes: body.errors?.[0]?.meta?.requiredScopes }
        );
      case 404:
        return new ACCError(
          'Resource Not Found',
          'NOT_FOUND',
          404
        );
      case 429:
        return new ACCError(
          'Rate Limit Exceeded',
          'RATE_LIMITED',
          429,
          { 
            retryAfter: response.headers.get('Retry-After'),
            limit: response.headers.get('X-RateLimit-Limit'),
            remaining: response.headers.get('X-RateLimit-Remaining')
          }
        );
      case 500:
        return new ACCError(
          'Internal Server Error',
          'SERVER_ERROR',
          500,
          { retryable: true }
        );
      default:
        return new ACCError(
          `HTTP ${status}: ${response.statusText}`,
          'UNKNOWN_ERROR',
          status
        );
    }
  }
}
```

### 2. Circuit Breaker Implementation
```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000;
    this.resetTimeout = options.resetTimeout || 30000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }
  
  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        if (fallback) return fallback();
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await this.callWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback && this.state === 'OPEN') {
        return fallback();
      }
      throw error;
    }
  }
  
  async callWithTimeout(operation) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
      )
    ]);
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}
```

## Performance Optimization

### 1. Intelligent Caching Strategy
```javascript
class ACCCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    
    // Cache configuration per API type
    this.cachePolicies = {
      'issue-types': { ttl: 3600000, priority: 'high' }, // 1 hour
      'projects': { ttl: 1800000, priority: 'high' }, // 30 minutes
      'users': { ttl: 900000, priority: 'medium' }, // 15 minutes
      'issues': { ttl: 60000, priority: 'low' }, // 1 minute
      'rfis': { ttl: 120000, priority: 'low' }, // 2 minutes
      'submittals': { ttl: 300000, priority: 'medium' } // 5 minutes
    };
  }
  
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }
  
  getCacheType(endpoint) {
    for (const [type, policy] of Object.entries(this.cachePolicies)) {
      if (endpoint.includes(type)) {
        return { type, ...policy };
      }
    }
    return { type: 'default', ttl: this.defaultTTL, priority: 'low' };
  }
  
  async get(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    const ttl = this.ttlMap.get(key);
    if (Date.now() > ttl) {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      return null;
    }
    
    return item;
  }
  
  async set(endpoint, params, data) {
    const key = this.generateKey(endpoint, params);
    const cacheConfig = this.getCacheType(endpoint);
    
    // Implement LRU eviction if needed
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, data);
    this.ttlMap.set(key, Date.now() + cacheConfig.ttl);
  }
  
  evictLRU() {
    // Simple LRU: remove oldest entries based on priority
    const entries = Array.from(this.cache.entries());
    const lowPriorityEntries = entries.filter(([key]) => {
      const cacheType = this.getCacheType(key);
      return cacheType.priority === 'low';
    });
    
    if (lowPriorityEntries.length > 0) {
      const [keyToRemove] = lowPriorityEntries[0];
      this.cache.delete(keyToRemove);
      this.ttlMap.delete(keyToRemove);
    } else {
      // Remove oldest entry
      const [keyToRemove] = entries[0];
      this.cache.delete(keyToRemove);
      this.ttlMap.delete(keyToRemove);
    }
  }
  
  invalidate(pattern) {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.ttlMap.delete(key);
    });
  }
}
```

### 2. Request Batching and Deduplication
```javascript
class RequestBatcher {
  constructor(options = {}) {
    this.batchWindow = options.batchWindow || 100; // ms
    this.maxBatchSize = options.maxBatchSize || 10;
    this.pendingRequests = new Map();
    this.batchTimeouts = new Map();
  }
  
  async batchRequest(key, requestFn) {
    if (!this.pendingRequests.has(key)) {
      this.pendingRequests.set(key, []);
      this.scheduleBatch(key, requestFn);
    }
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.get(key).push({ resolve, reject });
    });
  }
  
  scheduleBatch(key, requestFn) {
    const timeoutId = setTimeout(async () => {
      await this.executeBatch(key, requestFn);
    }, this.batchWindow);
    
    this.batchTimeouts.set(key, timeoutId);
  }
  
  async executeBatch(key, requestFn) {
    const requests = this.pendingRequests.get(key) || [];
    this.pendingRequests.delete(key);
    
    const timeoutId = this.batchTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.batchTimeouts.delete(key);
    }
    
    if (requests.length === 0) return;
    
    try {
      const result = await requestFn();
      requests.forEach(({ resolve }) => resolve(result));
    } catch (error) {
      requests.forEach(({ reject }) => reject(error));
    }
  }
}

// Usage example
class IssuesServiceWithBatching {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.batcher = new RequestBatcher();
  }
  
  async getIssueTypes(projectId) {
    const batchKey = `issue-types:${projectId}`;
    return this.batcher.batchRequest(batchKey, () =>
      this.apiClient.get(`/construction/issues/v1/projects/${projectId}/issue-types?include=subtypes`)
    );
  }
}
```

### 3. Connection Pooling and Keep-Alive
```javascript
class ACCAPIClient {
  constructor(authManager, options = {}) {
    this.authManager = authManager;
    
    // Configure HTTP agent for connection reuse
    this.httpAgent = new (require('http').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000
    });
    
    this.httpsAgent = new (require('https').Agent)({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000
    });
  }
  
  getFetchOptions(url) {
    const isHttps = url.startsWith('https:');
    return {
      agent: isHttps ? this.httpsAgent : this.httpAgent,
      timeout: 30000,
      compress: true
    };
  }
}
```

## Data Consistency and Synchronization

### 1. Event-Driven Updates
```javascript
class ACCEventManager {
  constructor() {
    this.eventHandlers = new Map();
    this.eventQueue = [];
    this.processing = false;
  }
  
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }
  
  emit(eventType, data) {
    this.eventQueue.push({ eventType, data, timestamp: Date.now() });
    this.processQueue();
  }
  
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      const handlers = this.eventHandlers.get(event.eventType) || [];
      
      await Promise.all(
        handlers.map(handler => 
          handler(event.data).catch(error => 
            console.error(`Event handler error for ${event.eventType}:`, error)
          )
        )
      );
    }
    
    this.processing = false;
  }
}

// Usage in MCP Server
class ACCMCPServer {
  constructor() {
    this.eventManager = new ACCEventManager();
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.eventManager.on('issue.created', async (issueData) => {
      // Invalidate related caches
      this.cache.invalidate(`issues:${issueData.projectId}`);
      
      // Send notifications
      await this.notificationService.sendIssueCreatedNotification(issueData);
      
      // Update analytics
      this.analytics.trackIssueCreation(issueData);
    });
  }
}
```

### 2. Optimistic Updates with Rollback
```javascript
class OptimisticUpdateManager {
  constructor(apiClient, cache) {
    this.apiClient = apiClient;
    this.cache = cache;
    this.pendingUpdates = new Map();
  }
  
  async updateWithOptimism(resourceKey, updateData, apiCall) {
    const optimisticId = Date.now().toString();
    
    try {
      // Apply optimistic update
      const currentData = await this.cache.get(resourceKey);
      const optimisticData = { ...currentData, ...updateData, _optimistic: true };
      await this.cache.set(resourceKey, optimisticData);
      
      this.pendingUpdates.set(optimisticId, {
        resourceKey,
        originalData: currentData,
        optimisticData
      });
      
      // Make actual API call
      const result = await apiCall();
      
      // Replace optimistic data with real data
      await this.cache.set(resourceKey, result);
      this.pendingUpdates.delete(optimisticId);
      
      return result;
    } catch (error) {
      // Rollback optimistic update
      const pending = this.pendingUpdates.get(optimisticId);
      if (pending) {
        await this.cache.set(pending.resourceKey, pending.originalData);
        this.pendingUpdates.delete(optimisticId);
      }
      throw error;
    }
  }
}
```

## Security Best Practices

### 1. Token Security and Rotation
```javascript
class SecureTokenManager {
  constructor(options = {}) {
    this.encryptionKey = options.encryptionKey || process.env.TOKEN_ENCRYPTION_KEY;
    this.tokenStorage = new Map();
    this.rotationInterval = options.rotationInterval || 3600000; // 1 hour
    
    if (!this.encryptionKey) {
      throw new Error('Token encryption key is required');
    }
  }
  
  encrypt(token) {
    const crypto = require('crypto');
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decrypt(encryptedToken) {
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  storeToken(key, token, expiresIn) {
    const encryptedToken = this.encrypt(token);
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    this.tokenStorage.set(key, {
      token: encryptedToken,
      expiresAt,
      createdAt: Date.now()
    });
    
    // Schedule rotation
    this.scheduleRotation(key);
  }
  
  getToken(key) {
    const stored = this.tokenStorage.get(key);
    if (!stored || Date.now() >= stored.expiresAt) {
      this.tokenStorage.delete(key);
      return null;
    }
    
    return this.decrypt(stored.token);
  }
  
  scheduleRotation(key) {
    setTimeout(() => {
      if (this.tokenStorage.has(key)) {
        this.rotateToken(key);
      }
    }, this.rotationInterval);
  }
  
  async rotateToken(key) {
    // Implementation depends on token type and refresh capabilities
    console.log(`Token rotation scheduled for key: ${key}`);
  }
}
```

### 2. Input Validation and Sanitization
```javascript
class InputValidator {
  static validateProjectId(projectId) {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('Project ID must be a non-empty string');
    }
    
    // ACC project IDs follow pattern: b.{uuid}
    const pattern = /^b\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!pattern.test(projectId)) {
      throw new Error('Invalid project ID format');
    }
    
    return projectId;
  }
  
  static validateIssueData(issueData) {
    const errors = [];
    
    if (!issueData.title || issueData.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (issueData.title && issueData.title.length > 255) {
      errors.push('Title must be 255 characters or less');
    }
    
    if (issueData.priority && !['low', 'medium', 'high', 'critical'].includes(issueData.priority)) {
      errors.push('Priority must be one of: low, medium, high, critical');
    }
    
    if (issueData.dueDate) {
      const dueDate = new Date(issueData.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.push('Due date must be a valid ISO 8601 date');
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }
    
    return {
      title: issueData.title.trim(),
      description: (issueData.description || '').trim(),
      priority: issueData.priority || 'medium',
      dueDate: issueData.dueDate,
      customAttributes: this.sanitizeCustomAttributes(issueData.customAttributes)
    };
  }
  
  static sanitizeCustomAttributes(attributes) {
    if (!attributes || typeof attributes !== 'object') {
      return {};
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim().substring(0, 1000); // Limit length
      } else if (typeof value === 'number' && !isNaN(value)) {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Skip invalid values
    }
    
    return sanitized;
  }
}
```

## Monitoring and Observability

### 1. Comprehensive Metrics Collection
```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        byStatusCode: new Map()
      },
      performance: {
        responseTimeP50: [],
        responseTimeP95: [],
        responseTimeP99: []
      },
      errors: {
        byType: new Map(),
        byEndpoint: new Map()
      },
      rateLimit: {
        violations: 0,
        nearMisses: 0,
        currentUtilization: new Map()
      }
    };
  }
  
  recordRequest(endpoint, method, status, duration, error = null) {
    this.metrics.requests.total++;
    
    if (status < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Track by endpoint
    const endpointKey = `${method} ${endpoint}`;
    const endpointStats = this.metrics.requests.byEndpoint.get(endpointKey) || {
      total: 0, successful: 0, failed: 0
    };
    endpointStats.total++;
    if (status < 400) endpointStats.successful++;
    else endpointStats.failed++;
    this.metrics.requests.byEndpoint.set(endpointKey, endpointStats);
    
    // Track by status code
    const statusStats = this.metrics.requests.byStatusCode.get(status) || 0;
    this.metrics.requests.byStatusCode.set(status, statusStats + 1);
    
    // Record performance
    this.recordPerformance(duration);
    
    // Record errors
    if (error) {
      this.recordError(error, endpoint);
    }
  }
  
  recordPerformance(duration) {
    this.metrics.performance.responseTimeP50.push(duration);
    this.metrics.performance.responseTimeP95.push(duration);
    this.metrics.performance.responseTimeP99.push(duration);
    
    // Keep only recent measurements (sliding window)
    const maxSamples = 1000;
    if (this.metrics.performance.responseTimeP50.length > maxSamples) {
      this.metrics.performance.responseTimeP50.shift();
      this.metrics.performance.responseTimeP95.shift();
      this.metrics.performance.responseTimeP99.shift();
    }
  }
  
  recordError(error, endpoint) {
    const errorType = error.code || error.name || 'Unknown';
    const errorCount = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, errorCount + 1);
    
    const endpointErrorCount = this.metrics.errors.byEndpoint.get(endpoint) || 0;
    this.metrics.errors.byEndpoint.set(endpoint, endpointErrorCount + 1);
  }
  
  getMetricsSummary() {
    const successRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2)
      : 0;
    
    const avgResponseTime = this.calculatePercentile(
      this.metrics.performance.responseTimeP50, 
      0.5
    );
    
    return {
      requests: {
        total: this.metrics.requests.total,
        successRate: `${successRate}%`,
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`
      },
      topErrors: this.getTopErrors(),
      slowestEndpoints: this.getSlowestEndpoints()
    };
  }
  
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
  
  getTopErrors() {
    return Array.from(this.metrics.errors.byType.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }
  
  getSlowestEndpoints() {
    // Implementation would track response times per endpoint
    return [];
  }
}
```

### 2. Health Check Implementation
```javascript
class HealthCheckService {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.healthStatus = {
      status: 'unknown',
      services: {},
      timestamp: null
    };
  }
  
  async checkHealth() {
    const healthChecks = await Promise.allSettled([
      this.checkAuthService(),
      this.checkAPIConnectivity(),
      this.checkDatabase(),
      this.checkCache(),
      this.checkExternalDependencies()
    ]);
    
    const services = {};
    let overallHealthy = true;
    
    healthChecks.forEach((result, index) => {
      const serviceName = ['auth', 'api', 'database', 'cache', 'external'][index];
      
      if (result.status === 'fulfilled') {
        services[serviceName] = {
          status: 'healthy',
          responseTime: result.value.responseTime,
          details: result.value.details
        };
      } else {
        services[serviceName] = {
          status: 'unhealthy',
          error: result.reason.message,
          details: result.reason.details
        };
        overallHealthy = false;
      }
    });
    
    this.healthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    };
    
    return this.healthStatus;
  }
  
  async checkAuthService() {
    const startTime = Date.now();
    
    try {
      await this.dependencies.authManager.get2LeggedToken();
      return {
        responseTime: Date.now() - startTime,
        details: 'Authentication service responding normally'
      };
    } catch (error) {
      throw new Error(`Auth service unhealthy: ${error.message}`);
    }
  }
  
  async checkAPIConnectivity() {
    const startTime = Date.now();
    
    try {
      // Make a lightweight API call
      const response = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials&client_id=test&client_secret=test'
      });
      
      // Even if auth fails, we know the API is reachable
      return {
        responseTime: Date.now() - startTime,
        details: 'API endpoints reachable'
      };
    } catch (error) {
      throw new Error(`API connectivity failed: ${error.message}`);
    }
  }
  
  async checkDatabase() {
    // Implementation depends on your database choice
    return {
      responseTime: 10,
      details: 'Database connection healthy'
    };
  }
  
  async checkCache() {
    const startTime = Date.now();
    
    try {
      const testKey = 'health-check';
      const testValue = Date.now().toString();
      
      await this.dependencies.cache.set(testKey, testValue);
      const retrieved = await this.dependencies.cache.get(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('Cache read/write mismatch');
      }
      
      return {
        responseTime: Date.now() - startTime,
        details: 'Cache read/write operations successful'
      };
    } catch (error) {
      throw new Error(`Cache unhealthy: ${error.message}`);
    }
  }
  
  async checkExternalDependencies() {
    // Check any external services your MCP server depends on
    return {
      responseTime: 5,
      details: 'All external dependencies healthy'
    };
  }
}
```

This comprehensive best practices guide should provide a solid foundation for building robust, maintainable, and scalable ACC MCP server implementations.
