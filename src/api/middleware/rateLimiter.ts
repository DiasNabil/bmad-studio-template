// src/api/middleware/rateLimiter.ts
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { RateLimitConfig, ApiErrorCode, HttpStatus } from '../types';
import './express-types'; // Import type extensions

/**
 * Default rate limit configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: false,
};

/**
 * Create rate limiter middleware with custom configuration
 */
export const createRateLimiter = (config: Partial<RateLimitConfig> = {}) => {
    const finalConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };

    return rateLimit({
        windowMs: finalConfig.windowMs,
        max: finalConfig.maxRequests,
        message: {
            success: false,
            error: {
                code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
                message: finalConfig.message,
            },
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        skipSuccessfulRequests: finalConfig.skipSuccessfulRequests,
        skip: (req: Request) => {
            // Skip rate limiting for health check endpoint
            return req.path === '/health';
        },
        keyGenerator: (req: Request) => {
            // Use IP address as key, but also consider user ID if authenticated
            const baseKey = req.ip || req.socket.remoteAddress || 'unknown';
            const userKey = req.user?.userId ? `user:${req.user.userId}` : `ip:${baseKey}`;
            return userKey;
        },
        handler: (req: Request, res: Response) => {
            res.status(HttpStatus.TOO_MANY_REQUESTS).json({
                success: false,
                error: {
                    code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
                    message: finalConfig.message,
                    details: {
                        windowMs: finalConfig.windowMs,
                        maxRequests: finalConfig.maxRequests,
                        retryAfter: Math.ceil(finalConfig.windowMs / 1000),
                    },
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
        },
    });
};

/**
 * Standard API rate limiter (100 requests per 15 minutes)
 */
export const apiRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints (10 requests per 15 minutes)
 */
export const strictRateLimiter = createRateLimiter({
    maxRequests: 10,
    message: 'Too many requests to sensitive endpoint, please try again later.',
});

/**
 * Workflow operation rate limiter (50 requests per 15 minutes)
 */
export const workflowRateLimiter = createRateLimiter({
    maxRequests: 50,
    message: 'Too many workflow operations, please try again later.',
});

/**
 * Metrics endpoint rate limiter (200 requests per 15 minutes)
 */
export const metricsRateLimiter = createRateLimiter({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000,
    message: 'Too many metrics requests, please try again later.',
    skipSuccessfulRequests: true,
});

/**
 * Authentication rate limiter (5 attempts per 15 minutes)
 */
export const authRateLimiter = createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many authentication attempts, please try again later.',
});

/**
 * Global rate limiter for all API endpoints
 */
export const globalRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // 500 requests per 15 minutes globally
    message: 'API rate limit exceeded, please try again later.',
});
