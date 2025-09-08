export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.WARN;

    private constructor() {}

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public error(message: string, context?: Record<string, unknown>): void {
        if (
            this.logLevel === LogLevel.ERROR ||
            this.logLevel === LogLevel.WARN ||
            this.logLevel === LogLevel.INFO ||
            this.logLevel === LogLevel.DEBUG
        ) {
            const logEntry = {
                level: LogLevel.ERROR,
                timestamp: new Date().toISOString(),
                message,
                context,
            };
            console.error(JSON.stringify(logEntry));
        }
    }

    public warn(message: string, context?: Record<string, unknown>): void {
        if (
            this.logLevel === LogLevel.WARN ||
            this.logLevel === LogLevel.INFO ||
            this.logLevel === LogLevel.DEBUG
        ) {
            const logEntry = {
                level: LogLevel.WARN,
                timestamp: new Date().toISOString(),
                message,
                context,
            };
            console.warn(JSON.stringify(logEntry));
        }
    }
}
