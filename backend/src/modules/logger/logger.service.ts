import { Injectable, Logger, LoggerService as NestLoggerService } from '@nestjs/common';

/**
 * Custom Logger Service
 * Wraps NestJS Logger for consistent logging across the application
 * Provides structured logging with context
 */
@Injectable()
export class AppLogger implements NestLoggerService {
  private logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context || 'App');
  }

  /**
   * Log informational message
   */
  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  /**
   * Log error message
   */
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(message, context);
    }
  }

  /**
   * Log verbose message (only in development)
   */
  verbose(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.verbose(message, context);
    }
  }

  /**
   * Create a logger instance with specific context
   */
  static create(context: string): AppLogger {
    return new AppLogger(context);
  }
}

/**
 * Helper function to create logger instances
 */
export function createLogger(context: string): AppLogger {
  return AppLogger.create(context);
}
