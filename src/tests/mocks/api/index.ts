/**
 * Mock implementations of Autodesk SDK clients for testing
 */

import { MockResponseBuilder } from '../helpers/test-utils.js';

/**
 * Mock DataManagementClient for testing file and folder operations
 */
export class MockDataManagementClient {
    private mockResponses: Map<string, any> = new Map();
    private callHistory: any[] = [];

    constructor() {
        // Set up default responses
        this.setupDefaultResponses();
    }

    private setupDefaultResponses() {
        // Default hub response
        this.mockResponses.set('getHubs', {
            data: [
                {
                    id: 'b.test-account-id',
                    attributes: {
                        name: 'Test Account'
                    }
                }
            ]
        });

        // Default projects response
        this.mockResponses.set('getProjects', {
            data: [
                {
                    id: 'b.test-project-id',
                    attributes: {
                        name: 'Test Project'
                    }
                }
            ]
        });
    }

    // Record method calls for verification
    private recordCall(method: string, params: any) {
        this.callHistory.push({ method, params, timestamp: Date.now() });
    }

    // Mock implementation methods
    async getHubs(params: any) {
        this.recordCall('getHubs', params);
        return this.mockResponses.get('getHubs');
    }

    async getProjects(hubId: string, params: any) {
        this.recordCall('getProjects', { hubId, ...params });
        return this.mockResponses.get('getProjects');
    }

    async getFolderContents(projectId: string, folderId: string, params: any) {
        this.recordCall('getFolderContents', { projectId, folderId, ...params });
        return this.mockResponses.get('getFolderContents') || { data: [] };
    }

    async getItemVersions(projectId: string, itemId: string, params: any) {
        this.recordCall('getItemVersions', { projectId, itemId, ...params });
        return this.mockResponses.get('getItemVersions') || { data: [] };
    }

    // Test helpers
    setMockResponse(method: string, response: any) {
        this.mockResponses.set(method, response);
    }

    getCallHistory() {
        return this.callHistory;
    }

    getLastCall() {
        return this.callHistory[this.callHistory.length - 1];
    }

    wasCalledWith(method: string, params?: any): boolean {
        return this.callHistory.some(call => {
            if (call.method !== method) return false;
            if (!params) return true;
            
            // Deep comparison of params
            return JSON.stringify(call.params) === JSON.stringify(params);
        });
    }

    reset() {
        this.callHistory = [];
        this.mockResponses.clear();
        this.setupDefaultResponses();
    }
}

/**
 * Mock IssuesClient for testing issue management
 */
export class MockIssuesClient {
    private mockResponses: Map<string, any> = new Map();
    private callHistory: any[] = [];

    constructor() {
        this.setupDefaultResponses();
    }

    private setupDefaultResponses() {
        // Default issues response
        this.mockResponses.set('getIssues', {
            results: [
                {
                    id: 'issue-1',
                    title: 'Test Issue',
                    status: 'open',
                    priority: 'medium'
                }
            ]
        });

        // Default issue types response
        this.mockResponses.set('getIssuesTypes', {
            results: [
                { id: 'type-1', title: 'Design' },
                { id: 'type-2', title: 'Quality' },
                { id: 'type-3', title: 'Safety' }
            ]
        });

        // Default root causes response
        this.mockResponses.set('getIssuesRootCauses', {
            results: [
                { id: 'cause-1', title: 'Coordination' },
                { id: 'cause-2', title: 'Design' }
            ]
        });
    }

    private recordCall(method: string, params: any) {
        this.callHistory.push({ method, params, timestamp: Date.now() });
    }

    async getIssues(projectId: string, params: any) {
        this.recordCall('getIssues', { projectId, ...params });
        return this.mockResponses.get('getIssues');
    }

    async getIssuesTypes(projectId: string, params: any) {
        this.recordCall('getIssuesTypes', { projectId, ...params });
        return this.mockResponses.get('getIssuesTypes');
    }

    async getIssuesRootCauses(projectId: string, params: any) {
        this.recordCall('getIssuesRootCauses', { projectId, ...params });
        return this.mockResponses.get('getIssuesRootCauses');
    }

    async getIssueComments(projectId: string, issueId: string, params: any) {
        this.recordCall('getIssueComments', { projectId, issueId, ...params });
        return this.mockResponses.get('getIssueComments') || { results: [] };
    }

    // Test helpers
    setMockResponse(method: string, response: any) {
        this.mockResponses.set(method, response);
    }

    getCallHistory() {
        return this.callHistory;
    }

    wasCalledWith(method: string, params?: any): boolean {
        return this.callHistory.some(call => {
            if (call.method !== method) return false;
            if (!params) return true;
            return JSON.stringify(call.params) === JSON.stringify(params);
        });
    }

    reset() {
        this.callHistory = [];
        this.mockResponses.clear();
        this.setupDefaultResponses();
    }
}

/**
 * Mock for authentication functions
 */
export class MockAuthClient {
    private mockTokens: Map<string, { token: string; expiresAt: number }> = new Map();
    private shouldFail: boolean = false;
    private failureError: Error | null = null;

    async getServiceAccountAccessToken(
        clientId: string,
        clientSecret: string,
        saId: string,
        keyId: string,
        privateKey: string,
        scopes: string[]
    ) {
        if (this.shouldFail) {
            throw this.failureError || new Error('Authentication failed');
        }

        const scopeKey = scopes.join('+');
        const now = Date.now();
        
        // Check if we have a valid cached token
        const cached = this.mockTokens.get(scopeKey);
        if (cached && cached.expiresAt > now) {
            return {
                access_token: cached.token,
                expires_in: Math.floor((cached.expiresAt - now) / 1000)
            };
        }

        // Generate new token
        const token = `mock_token_${scopeKey}_${now}`;
        const expiresIn = 3600; // 1 hour
        
        this.mockTokens.set(scopeKey, {
            token,
            expiresAt: now + (expiresIn * 1000)
        });

        return {
            access_token: token,
            expires_in: expiresIn
        };
    }

    // Test helpers
    setFailure(shouldFail: boolean, error?: Error) {
        this.shouldFail = shouldFail;
        this.failureError = error || null;
    }

    expireToken(scopes: string[]) {
        const scopeKey = scopes.join('+');
        const cached = this.mockTokens.get(scopeKey);
        if (cached) {
            cached.expiresAt = Date.now() - 1000; // Expire 1 second ago
        }
    }

    reset() {
        this.mockTokens.clear();
        this.shouldFail = false;
        this.failureError = null;
    }
}

/**
 * Mock fetch implementation for testing HTTP requests
 */
export class MockFetch {
    private responses: Map<string, { status: number; body: any; headers?: any }> = new Map();
    private callHistory: any[] = [];

    constructor() {
        this.setupDefaultResponses();
    }

    private setupDefaultResponses() {
        // Default OAuth response
        this.responses.set('POST:/auth/token', {
            status: 200,
            body: {
                access_token: 'mock_oauth_token',
                expires_in: 3600,
                token_type: 'Bearer'
            }
        });
    }

    async fetch(url: string, options: any = {}) {
        const method = options.method || 'GET';
        const key = `${method}:${url}`;
        
        this.callHistory.push({
            url,
            method,
            options,
            timestamp: Date.now()
        });

        const response = this.responses.get(key);
        if (!response) {
            return {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ error: 'Not found' }),
                text: async () => 'Not found'
            };
        }

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: this.getStatusText(response.status),
            headers: new Map(Object.entries(response.headers || {})),
            json: async () => response.body,
            text: async () => JSON.stringify(response.body)
        };
    }

    private getStatusText(status: number): string {
        const statusTexts: { [key: number]: string } = {
            200: 'OK',
            201: 'Created',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error'
        };
        return statusTexts[status] || 'Unknown';
    }

    // Test helpers
    setResponse(method: string, url: string, response: { status: number; body: any; headers?: any }) {
        const key = `${method}:${url}`;
        this.responses.set(key, response);
    }

    getCallHistory() {
        return this.callHistory;
    }

    wasCalledWith(url: string, options?: any): boolean {
        return this.callHistory.some(call => {
            if (call.url !== url) return false;
            if (!options) return true;
            
            // Check method
            if (options.method && call.method !== options.method) return false;
            
            // Check headers
            if (options.headers) {
                const callHeaders = call.options.headers || {};
                for (const [key, value] of Object.entries(options.headers)) {
                    if (callHeaders[key] !== value) return false;
                }
            }
            
            return true;
        });
    }

    reset() {
        this.callHistory = [];
        this.responses.clear();
        this.setupDefaultResponses();
    }
}

/**
 * Create a mock module for testing
 */
export const createMockModule = (implementations: any) => {
    return {
        ...implementations,
        __esModule: true
    };
};

/**
 * Mock cache implementation for testing caching behavior
 */
export class MockCache {
    private cache: Map<string, any> = new Map();
    private accessCount: Map<string, number> = new Map();

    get(key: string): any {
        const count = this.accessCount.get(key) || 0;
        this.accessCount.set(key, count + 1);
        return this.cache.get(key);
    }

    set(key: string, value: any): void {
        this.cache.set(key, value);
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
        this.accessCount.clear();
    }

    getAccessCount(key: string): number {
        return this.accessCount.get(key) || 0;
    }

    size(): number {
        return this.cache.size;
    }
}
