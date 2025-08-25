/**
 * Centralized logging utility
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: number;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private isDevelopment = __DEV__;
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${dataStr}`;
  }

  public debug(message: string, context?: string, data?: any): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context, data));
    }
  }

  public info(message: string, context?: string, data?: any): void {
    console.info(this.formatMessage(LogLevel.INFO, message, context, data));
  }

  public warn(message: string, context?: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context, data));
  }

  public error(message: string, context?: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    
    console.error(this.formatMessage(LogLevel.ERROR, message, context, errorData));
  }
}

export const logger = Logger.getInstance();

// Convenience functions
export const logDebug = (message: string, context?: string, data?: any) => 
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: any) => 
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: any) => 
  logger.warn(message, context, data);

export const logError = (message: string, context?: string, error?: Error | any) => 
  logger.error(message, context, error);