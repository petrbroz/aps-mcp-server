import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';

// Create logs directory if it doesn't exist
if (!existsSync('logs')) {
    mkdirSync('logs');
}

// Create logger instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'acc-mcp-server' },
    transports: [
        // Write all logs to console in development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Write all logs with level `error` and below to `error.log`
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        // Write all logs to `combined.log`
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// Helper functions for common logging patterns
export const logApiCall = (endpoint: string, projectId?: string) => {
    logger.info('API call initiated', { endpoint, projectId });
};

export const logApiSuccess = (endpoint: string, dataCount?: number) => {
    logger.info('API call successful', { endpoint, dataCount });
};

export const logApiError = (endpoint: string, error: Error) => {
    logger.error('API call failed', { endpoint, error: error.message, stack: error.stack });
};