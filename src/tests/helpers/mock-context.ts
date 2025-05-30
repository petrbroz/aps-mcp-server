/**
 * Mock Context Helper for Testing
 * Provides a consistent mock context for tool testing
 */

import { mock } from 'node:test';

export interface MockContext {
    auth: {
        getAccessToken: any;
        authenticateWithOAuth: any;
    };
    logger: {
        info: any;
        error: any;
        warn: any;
        debug: any;
    };
    config: {
        APS_CLIENT_ID: string;
        APS_CLIENT_SECRET: string;
        SERVICE_ACCOUNT_ID?: string;
        SERVICE_ACCOUNT_KEY_ID?: string;
        SERVICE_ACCOUNT_PRIVATE_KEY?: string;
    };
}

/**
 * Creates a mock context for testing tools
 * @param overrides Optional overrides for specific test scenarios
 * @returns Mock context object
 */
export function createMockContext(overrides: Partial<MockContext> = {}): MockContext {
    return {
        auth: {
            getAccessToken: mock.fn(async (scopes: string[]) => ({
                access_token: 'mock-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            })),
            authenticateWithOAuth: mock.fn(async (scopes: string[]) => ({
                access_token: 'mock-oauth-token',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'mock-refresh-token'
            }))
        },
        logger: {
            info: mock.fn(),
            error: mock.fn(),
            warn: mock.fn(),
            debug: mock.fn()
        },
        config: {
            APS_CLIENT_ID: 'test-client-id',
            APS_CLIENT_SECRET: 'test-client-secret',
            SERVICE_ACCOUNT_ID: 'test-service-account',
            SERVICE_ACCOUNT_KEY_ID: 'test-key-id',
            SERVICE_ACCOUNT_PRIVATE_KEY: 'test-private-key'
        },
        ...overrides
    };
}

/**
 * Creates a failing auth context for error testing
 */
export function createFailingAuthContext(): MockContext {
    const context = createMockContext();
    
    context.auth.getAccessToken = mock.fn(async () => {
        throw new Error('Authentication failed: Invalid credentials');
    });
    
    context.auth.authenticateWithOAuth = mock.fn(async () => {
        throw new Error('OAuth authentication failed: User denied access');
    });
    
    return context;
}

/**
 * Creates a rate-limited auth context
 */
export function createRateLimitedContext(): MockContext {
    const context = createMockContext();
    let callCount = 0;
    
    context.auth.getAccessToken = mock.fn(async () => {
        callCount++;
        if (callCount <= 3) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        return {
            access_token: 'mock-access-token-after-retry',
            token_type: 'Bearer',
            expires_in: 3600
        };
    });
    
    return context;
}

/**
 * Asserts that logger was called with expected messages
 */
export function assertLoggerCalled(context: MockContext, level: 'info' | 'error' | 'warn' | 'debug', expectedMessage: string | RegExp) {
    const logger = context.logger[level];
    const calls = logger.mock.calls;
    
    const found = calls.some((call: any) => {
        const message = call.arguments[0];
        if (typeof expectedMessage === 'string') {
            return message.includes(expectedMessage);
        } else {
            return expectedMessage.test(message);
        }
    });
    
    if (!found) {
        throw new Error(`Expected logger.${level} to be called with "${expectedMessage}", but it wasn't`);
    }
}

/**
 * Resets all mocks in the context
 */
export function resetMockContext(context: MockContext) {
    Object.values(context.auth).forEach(fn => fn.mock?.resetCalls?.());
    Object.values(context.logger).forEach(fn => fn.mock?.resetCalls?.());
}
