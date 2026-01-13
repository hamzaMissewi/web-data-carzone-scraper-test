"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.setupLogger = setupLogger;
class Logger {
    constructor(level = "INFO") {
        this.level = level.toUpperCase();
    }
    shouldLog(messageLevel) {
        const levels = ["DEBUG", "INFO", "WARNING", "ERROR"];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(messageLevel);
        return messageLevelIndex >= currentLevelIndex;
    }
    formatMessage(level, message) {
        const timestamp = new Date()
            .toISOString()
            .replace("T", " ")
            .substring(0, 23);
        return `${timestamp} [${level}] ${message}`;
    }
    debug(message) {
        if (this.shouldLog("DEBUG")) {
            console.log(this.formatMessage("DEBUG", message));
        }
    }
    info(message) {
        if (this.shouldLog("INFO")) {
            console.log(this.formatMessage("INFO", message));
        }
    }
    warning(message) {
        if (this.shouldLog("WARNING")) {
            console.warn(this.formatMessage("WARNING", message));
        }
    }
    error(message) {
        if (this.shouldLog("ERROR")) {
            console.error(this.formatMessage("ERROR", message));
        }
    }
    exception(message, error) {
        console.error(this.formatMessage("ERROR", message));
        console.error(error.stack);
    }
}
exports.Logger = Logger;
function setupLogger(level) {
    return new Logger(level || "INFO");
}
//# sourceMappingURL=logger.js.map