# ACC API Code Examples and Implementation Patterns - 2025 Edition

## Authentication Implementation Patterns

### Complete Authentication Manager
```javascript
class ACCAuthManager {
  constructor(clientId, clientSecret, options = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = options.baseUrl || 'https://developer.api.autodesk.com';
    this.tokens = {
      twoLegged: null,
      threeLegged: null
    };
    this.tokenRefreshPromises = new Map();
  }

  async get2LeggedToken(forceRefresh = false) {
    if (!forceRefresh && this.tokens.twoLegged && !this.isTokenExpired(this.tokens.twoLegged)) {
      return this.tokens.twoLegged.access_token;
    }

    // Prevent multiple simultaneous token refreshes
    const cacheKey = '2LO';
    if (this.tokenRefreshPromises.has(cacheKey)) {
      await this.tokenRefreshPromises.get(cacheKey);
      return this.tokens.twoLegged.access_token;
    }

    const refreshPromise = this.fetch2LeggedToken();
    this.tokenRefreshPromises.set(cacheKey, refreshPromise);

    try {
      this.tokens.twoLegged = await refreshPromise;
      return this.tokens.twoLegged.access_token;
    } finally {
      this.tokenRefreshPromises.delete(cacheKey);
    }
  }

  async fetch2LeggedToken() {
    const response = await fetch(`${this.baseUrl}/authentication/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'account:read account:write data:read data:write'
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Authentication failed: ${error.error_description || response.statusText}`);
    }

    const token = await response.json();
    token.expires_at = Date.now() + (token.expires_in * 1000) - 60000; // 1 minute buffer
    return token;
  }

  async get3LeggedToken(authCode, redirectUri) {
    const response = await fetch(`${this.baseUrl}/authentication/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${error.error_description || response.statusText}`);
    }

    const token = await response.json();
    token.expires_at = Date.now() + (token.expires_in * 1000) - 60000;
    this.tokens.threeLegged = token;
    return token;
  }

  async refresh3LeggedToken() {
    if (!this.tokens.threeLegged?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/authentication/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.tokens.threeLegged.refresh_token
      })
    });

    if (!response.ok) {
      this.tokens.threeLegged = null; // Clear invalid token
      throw new Error('Token refresh failed');
    }

    const token = await response.json();
    token.expires_at = Date.now() + (token.expires_in * 1000) - 60000;
    this.tokens.threeLegged = token;
    return token;
  }

  isTokenExpired(token) {
    return !token || !token.expires_at || Date.now() >= token.expires_at;
  }

  generateAuthUrl(redirectUri, scopes = ['data:read', 'data:write'], state = null) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' ')
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.baseUrl}/authentication/v2/authorize?${params}`;
  }
}
```

## Issues API Implementation Examples

### Complete Issues Service
```javascript
class IssuesService {
  constructor(authManager, baseUrl = 'https://developer.api.autodesk.com') {
    this.authManager = authManager;
    this.baseUrl = baseUrl;
  }

  async listIssues(projectId, filters = {}) {
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page[limit]', filters.limit || '100');
    if (filters.offset) params.append('page[offset]', filters.offset);

    // Add filters
    if (filters.status) params.append('filter[status]', filters.status);
    if (filters.assignee) params.append('filter[assignee]', filters.assignee);
    if (filters.issueType) params.append('filter[issueType]', filters.issueType);
    if (filters.createdAfter) params.append('filter[created_at]', `gte:${filters.createdAfter}`);
    if (filters.createdBefore) params.append('filter[created_at]', `lte:${filters.createdBefore}`);

    // Add includes
    if (filters.include) {
      const includes = Array.isArray(filters.include) ? filters.include : [filters.include];
      params.append('include', includes.join(','));
    }

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/issues/v1/projects/${projectId}/issues?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getIssue(projectId, issueId, include = []) {
    const params = new URLSearchParams();
    if (include.length > 0) {
      params.append('include', include.join(','));
    }

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/issues/v1/projects/${projectId}/issues/${issueId}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Issue ${issueId} not found`);
      }
      throw new Error(`Failed to fetch issue: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createIssue(projectId, issueData) {
    // Validate required fields
    if (!issueData.title) throw new Error('Issue title is required');
    if (!issueData.issueTypeId) throw new Error('Issue type ID is required');

    const payload = {
      title: issueData.title,
      description: issueData.description || '',
      issueTypeId: issueData.issueTypeId,
      status: issueData.status || 'draft',
      priority: issueData.priority || 'medium',
      assignedTo: issueData.assignedTo,
      dueDate: issueData.dueDate,
      locationId: issueData.locationId,
      customAttributes: issueData.customAttributes || {},
      linkedDocuments: issueData.linkedDocuments || []
    };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/issues/v1/projects/${projectId}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to create issue: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  async updateIssue(projectId, issueId, updates) {
    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/issues/v1/projects/${projectId}/issues/${issueId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to update issue: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  async getIssueTypes(projectId, includeSubtypes = true) {
    const params = new URLSearchParams();
    if (includeSubtypes) {
      params.append('include', 'subtypes'); // Critical: subtypes won't be returned without this
    }

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/issues/v1/projects/${projectId}/issue-types?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issue types: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async addComment(projectId, issueId, comment, attachments = []) {
    const payload = {
      body: comment,
      attachments: attachments
    };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/issues/v1/projects/${projectId}/issues/${issueId}/comments`, {
      method: 'POST', 
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to add comment: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  // Utility method to get all issues with automatic pagination
  async getAllIssues(projectId, filters = {}) {
    const allIssues = [];
    let offset = 0;
    const limit = 200; // Maximum allowed
    
    while (true) {
      const response = await this.listIssues(projectId, {
        ...filters,
        limit,
        offset
      });
      
      allIssues.push(...response.results);
      
      // Check if we've retrieved all issues
      if (response.results.length < limit || 
          (response.pagination?.totalResults && allIssues.length >= response.pagination.totalResults)) {
        break;
      }
      
      offset += limit;
    }
    
    return allIssues;
  }
}
```

## RFIs API Implementation Examples

### RFIs Service with Latest 2024/2025 Features
```javascript
class RFIsService {
  constructor(authManager, baseUrl = 'https://developer.api.autodesk.com') {
    this.authManager = authManager;
    this.baseUrl = baseUrl;
  }

  async listRFIs(projectId, filters = {}) {
    const params = new URLSearchParams();
    
    // Pagination
    params.append('page[limit]', filters.limit || '100');
    if (filters.offset) params.append('page[offset]', filters.offset);

    // Filters
    if (filters.status) params.append('filter[status]', filters.status);
    if (filters.assignee) params.append('filter[assignee]', filters.assignee);
    if (filters.number) params.append('filter[number]', filters.number);
    if (filters.createdAfter) params.append('filter[created_at]', `gte:${filters.createdAfter}`);
    
    // Includes
    if (filters.include) {
      const includes = Array.isArray(filters.include) ? filters.include : [filters.include];
      params.append('include', includes.join(','));
    }

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/rfis/v2/projects/${projectId}/rfis?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RFIs: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createRFI(projectId, rfiData) {
    // Validate required fields
    if (!rfiData.subject) throw new Error('RFI subject is required');
    if (!rfiData.question) throw new Error('RFI question is required');

    const payload = {
      subject: rfiData.subject,
      question: rfiData.question,
      assignedTo: rfiData.assignedTo,
      dueDate: rfiData.dueDate,
      priority: rfiData.priority || 'medium',
      category: rfiData.category,
      customAttributes: rfiData.customAttributes || {},
      attachments: rfiData.attachments || []
    };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/rfis/v2/projects/${projectId}/rfis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to create RFI: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  async addResponse(projectId, rfiId, responseData) {
    const payload = {
      answer: responseData.answer,
      status: responseData.status || 'answered',
      attachments: responseData.attachments || []
    };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/rfis/v2/projects/${projectId}/rfis/${rfiId}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to add RFI response: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }
}
```

## Submittals API Implementation Examples - NEW Write Capabilities

### Submittals Service with 2024/2025 Write API Features
```javascript
class SubmittalsService {
  constructor(authManager, baseUrl = 'https://developer.api.autodesk.com') {
    this.authManager = authManager;
    this.baseUrl = baseUrl;
  }

  async listItems(projectId, filters = {}) {
    const params = new URLSearchParams();
    
    params.append('page[limit]', filters.limit || '100');
    if (filters.offset) params.append('page[offset]', filters.offset);

    if (filters.status) params.append('filter[status]', filters.status);
    if (filters.package) params.append('filter[package]', filters.package);
    if (filters.customIdentifier) params.append('filter[customIdentifier]', filters.customIdentifier);
    
    if (filters.include) {
      const includes = Array.isArray(filters.include) ? filters.include : [filters.include];
      params.append('include', includes.join(','));
    }

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/items?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch submittal items: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // NEW: Create submittal item (Write API available in 2024/2025)
  async createItem(projectId, itemData) {
    if (!itemData.name) throw new Error('Submittal item name is required');

    const payload = {
      name: itemData.name,
      description: itemData.description || '',
      packageId: itemData.packageId,
      specSectionId: itemData.specSectionId,
      status: itemData.status || 'draft',
      customIdentifier: itemData.customIdentifier,
      dueDate: itemData.dueDate,
      customAttributes: itemData.customAttributes || {},
      attachments: itemData.attachments || []
    };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to create submittal item: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  // NEW: Create spec section (Write API available in 2024/2025)
  async createSpec(projectId, specData) {
    if (!specData.name) throw new Error('Spec section name is required');

    const payload = {
      name: specData.name,
      number: specData.number,
      description: specData.description || ''
    };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/specs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to create spec section: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  // NEW: Validate custom identifier
  async validateCustomIdentifier(projectId, customIdentifier) {
    const payload = { customIdentifier };

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/items:validate-custom-identifier`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to validate custom identifier: ${error.errors?.[0]?.detail || response.statusText}`);
    }

    return response.json();
  }

  // NEW: Get next available custom identifier
  async getNextCustomIdentifier(projectId) {
    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/items:next-custom-identifier`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get next custom identifier: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getPackages(projectId) {
    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/packages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch packages: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getItemTypes(projectId) {
    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/submittals/v1/projects/${projectId}/item-types`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch item types: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Forms API Implementation Examples

### Forms Service with Known Issue Workarounds
```javascript
class FormsService {
  constructor(authManager, baseUrl = 'https://developer.api.autodesk.com') {
    this.authManager = authManager;
    this.baseUrl = baseUrl;
  }

  async listForms(projectId, filters = {}) {
    const params = new URLSearchParams();
    
    // Note: limit parameter may be ignored when filtering by location
    params.append('page[limit]', filters.limit || '100');
    if (filters.offset) params.append('page[offset]', filters.offset);

    if (filters.status) params.append('filter[status]', filters.status);
    if (filters.template) params.append('filter[template]', filters.template);
    
    // Handle location filtering (known to cause limit issues)
    if (filters.locationIds && filters.locationIds.length > 0) {
      filters.locationIds.forEach(id => params.append('filter[location]', id));
    }

    if (filters.include) {
      const includes = Array.isArray(filters.include) ? filters.include : [filters.include];
      params.append('include', includes.join(','));
    }

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/construction/forms/v1/projects/${projectId}/forms?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch forms: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Workaround for pagination issues
  async getAllForms(projectId, filters = {}) {
    const allForms = [];
    let offset = 0;
    const limit = filters.locationIds?.length > 0 ? 200 : 100;
    
    while (true) {
      try {
        const response = await this.listForms(projectId, {
          ...filters,
          limit,
          offset
        });
        
        if (!response.results || response.results.length === 0) break;
        
        allForms.push(...response.results);
        
        // Handle different pagination scenarios
        if (response.results.length < limit) break;
        if (filters.locationIds?.length > 0 && response.results.length >= 200) {
          // Location filtering may return all results at once
          break;
        }
        
        offset += limit;
      } catch (error) {
        if (error.message.includes('404')) break;
        throw error;
      }
    }
    
    return allForms;
  }
}
```

## File Management Implementation Examples

### Files Service with Proper Error Handling
```javascript
class FilesService {
  constructor(authManager, baseUrl = 'https://developer.api.autodesk.com') {
    this.authManager = authManager;
    this.baseUrl = baseUrl;
  }

  async getTopFolders(hubId, projectId) {
    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch top folders: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFolderContents(hubId, projectId, folderId, options = {}) {
    const params = new URLSearchParams();
    
    if (options.pageNumber) params.append('page[number]', options.pageNumber);
    if (options.pageSize) params.append('page[size]', Math.min(options.pageSize, 200));
    if (options.filterExtension) params.append('filter[extension.type]', options.filterExtension);

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/project/v1/hubs/${hubId}/projects/${projectId}/folders/${folderId}/contents?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch folder contents: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchFiles(hubId, projectId, folderId, query, options = {}) {
    const params = new URLSearchParams({ q: query });
    
    if (options.filterExtension) params.append('filter[extension.type]', options.filterExtension);

    const token = await this.authManager.get3LeggedToken();
    const response = await fetch(`${this.baseUrl}/project/v1/hubs/${hubId}/projects/${projectId}/folders/${folderId}/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.api+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search files: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Complete MCP Server Tool Implementation Example

### Issues Tool with Full Error Handling and Rate Limiting
```javascript
class IssuesTools {
  constructor(authManager) {
    this.authManager = authManager;
    this.issuesService = new IssuesService(authManager);
    this.rateLimiter = new RateLimitedQueue(90); // Conservative rate limit
  }

  async getIssues(params) {
    return this.rateLimiter.enqueue(async () => {
      try {
        const { projectId, ...filters } = params;
        
        if (!projectId) {
          throw new Error('Project ID is required');
        }

        const issues = await this.issuesService.listIssues(projectId, filters);
        
        return {
          content: [{
            type: "text",
            text: `Found ${issues.results.length} issues in project ${projectId}`
          }],
          _meta: {
            total: issues.pagination?.totalResults || issues.results.length,
            hasMore: issues.results.length === (filters.limit || 100)
          }
        };
      } catch (error) {
        return {
          content: [{
            type: "text", 
            text: `Error fetching issues: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async createIssue(params) {
    return this.rateLimiter.enqueue(async () => {
      try {
        const { projectId, ...issueData } = params;
        
        if (!projectId) {
          throw new Error('Project ID is required');
        }

        // Get issue types if not provided
        if (!issueData.issueTypeId) {
          const types = await this.issuesService.getIssueTypes(projectId);
          if (types.results && types.results.length > 0) {
            issueData.issueTypeId = types.results[0].id;
          } else {
            throw new Error('No issue types available in project');
          }
        }

        const newIssue = await this.issuesService.createIssue(projectId, issueData);
        
        return {
          content: [{
            type: "text",
            text: `Successfully created issue: ${newIssue.title} (ID: ${newIssue.id})`
          }],
          _meta: {
            issueId: newIssue.id,
            issueNumber: newIssue.number
          }
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error creating issue: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  getToolDefinitions() {
    return [
      {
        name: "get-issues",
        description: "Retrieve issues from an ACC project with filtering options",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ACC project ID"
            },
            status: {
              type: "string",
              enum: ["draft", "open", "closed", "void"],
              description: "Filter by issue status"
            },
            assignee: {
              type: "string", 
              description: "Filter by assignee user ID"
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 200,
              description: "Number of issues to retrieve (default: 100)"
            },
            offset: {
              type: "number",
              minimum: 0,
              description: "Pagination offset"
            },
            include: {
              type: "array",
              items: {
                type: "string",
                enum: ["attachments", "comments", "linkedDocuments"]
              },
              description: "Additional data to include"
            }
          },
          required: ["projectId"]
        }
      },
      {
        name: "create-issue",
        description: "Create a new issue in an ACC project",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ACC project ID"
            },
            title: {
              type: "string",
              description: "Issue title"
            },
            description: {
              type: "string",
              description: "Issue description"
            },
            issueTypeId: {
              type: "string",
              description: "Issue type ID (optional - will use first available if not provided)"
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "Issue priority (default: medium)"
            },
            assignedTo: {
              type: "string",
              description: "User ID to assign the issue to"
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO 8601 format"
            },
            customAttributes: {
              type: "object",
              description: "Custom field values"
            }
          },
          required: ["projectId", "title"]
        }
      }
    ];
  }
}
```

This comprehensive code examples document provides production-ready implementations with proper error handling, rate limiting, and the latest API features available in 2024/2025.
