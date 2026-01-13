export declare class Logger {
    private level;
    constructor(level?: string);
    private shouldLog;
    private formatMessage;
    debug(message: string): void;
    info(message: string): void;
    warning(message: string): void;
    error(message: string): void;
    exception(message: string, error: Error): void;
}
export declare function setupLogger(level?: string): Logger;
//# sourceMappingURL=logger.d.ts.map