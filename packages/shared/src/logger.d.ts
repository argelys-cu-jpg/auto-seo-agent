type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext {
    service?: string;
    runId?: string;
    topicId?: string;
    publicationId?: string;
    [key: string]: unknown;
}
export declare function log(level: LogLevel, message: string, context?: LogContext): void;
export {};
