// src/api/types.ts
import { z } from 'zod';
import { WorkflowStatus } from '../workflow/types';

// API versioning
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Base API response structure
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
    timestamp: string;
    version: string;
}

// Error handling
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}

// Health check response
export interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    version: string;
    services: {
        workflow: 'up' | 'down';
        database: 'up' | 'down';
        redis: 'up' | 'down';
    };
    metrics: {
        activeWorkflows: number;
        totalRequests: number;
        averageResponseTime: number;
    };
}

// Metrics response (Prometheus format)
export interface PrometheusMetrics {
    metrics: string;
}

// Audit log entry
export interface AuditEntry {
    id: string;
    timestamp: string;
    action: string;
    resource: string;
    user: string;
    details: Record<string, any>;
    result: 'success' | 'failure';
}

// Workflow API types
export const StartWorkflowSchema = z.object({
    workflowId: z.string().min(1),
    context: z.object({
        initiator: z.string(),
        metadata: z.record(z.any()).optional(),
    }),
});

export const WorkflowControlSchema = z.object({
    action: z.enum(['pause', 'resume', 'cancel']),
});

export type StartWorkflowRequest = z.infer<typeof StartWorkflowSchema>;
export type WorkflowControlRequest = z.infer<typeof WorkflowControlSchema>;

export interface WorkflowStatusResponse {
    workflowId: string;
    status: WorkflowStatus;
    currentStep?: string;
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
    startTime?: string;
    endTime?: string;
    results?: any[];
    error?: string;
}

// Agent API types
export interface AgentInfo {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'inactive' | 'busy';
    capabilities: string[];
    currentTask?: string;
    lastActivity: string;
}

// JWT payload
export interface JwtPayload {
    userId: string;
    roles: string[];
    permissions: string[];
    iat: number;
    exp: number;
}

// Request context
export interface RequestContext {
    user?: JwtPayload;
    requestId: string;
    startTime: number;
    ip: string;
    userAgent: string;
}

// Rate limiting configuration
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message: string;
    skipSuccessfulRequests?: boolean;
}

// Common HTTP status codes
export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
}

// API error codes
export enum ApiErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
    WORKFLOW_ALREADY_RUNNING = 'WORKFLOW_ALREADY_RUNNING',
    WORKFLOW_EXECUTION_ERROR = 'WORKFLOW_EXECUTION_ERROR',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// Middleware types
export interface ValidationMiddleware {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}

export interface CorsConfig {
    origin: string[] | string;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
}

// Server configuration
export interface ServerConfig {
    port: number;
    host: string;
    cors: CorsConfig;
    rateLimit: RateLimitConfig;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    logging: {
        level: string;
        format: 'json' | 'text';
    };
}
