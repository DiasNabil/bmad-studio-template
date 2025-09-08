// src/api/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { sign, verify, SignOptions } from 'jsonwebtoken';
import { JwtPayload, ApiErrorCode, HttpStatus } from '../types';
import './express-types'; // Import type extensions

/**
 * JWT Authentication Middleware
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            error: {
                code: ApiErrorCode.AUTHENTICATION_REQUIRED,
                message: 'Access token is required',
            },
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'bmad-studio-secret-key';
        const decoded = verify(token, secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            error: {
                code: ApiErrorCode.AUTHENTICATION_REQUIRED,
                message: 'Invalid or expired token',
            },
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    }
};

/**
 * Optional JWT Authentication - doesn't fail if no token provided
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'bmad-studio-secret-key';
        const decoded = verify(token, secret) as JwtPayload;
        req.user = decoded;
    } catch (error) {
        // Log error but don't fail the request
        console.warn('Invalid token provided:', error);
    }

    next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: ApiErrorCode.AUTHENTICATION_REQUIRED,
                    message: 'Authentication required',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
            return;
        }

        const hasRequiredRole = requiredRoles.some((role) => req.user!.roles.includes(role));

        if (!hasRequiredRole) {
            res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                error: {
                    code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
                    message: `Required roles: ${requiredRoles.join(', ')}`,
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
            return;
        }

        next();
    };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(HttpStatus.UNAUTHORIZED).json({
                success: false,
                error: {
                    code: ApiErrorCode.AUTHENTICATION_REQUIRED,
                    message: 'Authentication required',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
            return;
        }

        const hasRequiredPermission = requiredPermissions.some((permission) =>
            req.user!.permissions.includes(permission)
        );

        if (!hasRequiredPermission) {
            res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                error: {
                    code: ApiErrorCode.INSUFFICIENT_PERMISSIONS,
                    message: `Required permissions: ${requiredPermissions.join(', ')}`,
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
            return;
        }

        next();
    };
};

/**
 * Generate JWT token for testing/development
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
    const secret = process.env.JWT_SECRET || 'bmad-studio-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return sign(payload as object, secret, { expiresIn } as SignOptions);
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): JwtPayload | null => {
    try {
        const secret = process.env.JWT_SECRET || 'bmad-studio-secret-key';
        return verify(token, secret) as JwtPayload;
    } catch (error) {
        return null;
    }
};
