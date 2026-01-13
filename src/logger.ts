export class Logger {
  private level: string;

  constructor(level: string = "INFO") {
    this.level = level.toUpperCase();
  }

  private shouldLog(messageLevel: string): boolean {
    const levels = ["DEBUG", "INFO", "WARNING", "ERROR"];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(messageLevel);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 23);
    return `${timestamp} [${level}] ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog("DEBUG")) {
      console.log(this.formatMessage("DEBUG", message));
    }
  }

  info(message: string): void {
    if (this.shouldLog("INFO")) {
      console.log(this.formatMessage("INFO", message));
    }
  }

  warning(message: string): void {
    if (this.shouldLog("WARNING")) {
      console.warn(this.formatMessage("WARNING", message));
    }
  }

  error(message: string): void {
    if (this.shouldLog("ERROR")) {
      console.error(this.formatMessage("ERROR", message));
    }
  }

  exception(message: string, error: Error): void {
    console.error(this.formatMessage("ERROR", message));
    console.error(error.stack);
  }
}

export function setupLogger(level?: string): Logger {
  return new Logger(level || "INFO");
}
