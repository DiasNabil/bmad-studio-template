// src/api/middleware/express-types.ts
import { JwtPayload } from '../types';

// Extend Express Request type
declare module 'express-serve-static-core' {
    interface Request {
        user?: JwtPayload;
        context?: {
            requestId: string;
            startTime: number;
            ip: string;
            userAgent: string;
        };
    }
}
