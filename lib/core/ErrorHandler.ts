// Advanced Error Handling Utility

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface BMadErrorOptions {
  code?: string;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
}

export class BMadError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string, 
    options: BMadErrorOptions = {}
  ) {
    super(message);
    
    this.name = 'BMadError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
    this.context = options.context;

    // Maintains proper stack trace for where the error was thrown
    Error.captureStackTrace(this, BMadError);
  }

  // Serialize error for logging or transmission
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      stack: this.stack
    };
  }

  // Static method for creating common error types
  public static create(
    message: string, 
    options: BMadErrorOptions = {}
  ): BMadError {
    return new BMadError(message, options);
  }
}

// Global error handler for unhandled promises and exceptions
export function setupGlobalErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    const bmadError = error instanceof BMadError 
      ? error 
      : new BMadError(error.message, { 
          severity: ErrorSeverity.CRITICAL 
        });
    
    // eslint-disable-next-line no-console
    console.error('Uncaught Exception:', bmadError.toJSON());
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const bmadError = reason instanceof BMadError
      ? reason
      : new BMadError(String(reason), {
          severity: ErrorSeverity.HIGH
        });
    
    // eslint-disable-next-line no-console
    console.error('Unhandled Rejection:', bmadError.toJSON());
  });
}