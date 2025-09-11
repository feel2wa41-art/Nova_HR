// Logger utility for conditional logging based on environment
import { app } from 'electron'
import { join } from 'node:path'

export class Logger {
  private static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  static log(...args: any[]): void {
    if (this.isDevelopment()) {
      console.log(...args)
    }
  }

  static warn(...args: any[]): void {
    if (this.isDevelopment()) {
      console.warn(...args)
    }
  }

  static error(...args: any[]): void {
    // Always show errors, even in production
    console.error(...args)
  }

  static info(...args: any[]): void {
    if (this.isDevelopment()) {
      console.info(...args)
    }
  }

  static debug(...args: any[]): void {
    if (this.isDevelopment()) {
      console.debug(...args)
    }
  }

  static getLogFolder(): string {
    try {
      return join(app.getPath('logs'))
    } catch (error) {
      // Fallback if app is not available
      return join(process.cwd(), 'logs')
    }
  }
}

// For backwards compatibility, export individual functions
export const log = Logger.log.bind(Logger)
export const warn = Logger.warn.bind(Logger)
export const error = Logger.error.bind(Logger)
export const info = Logger.info.bind(Logger)
export const debug = Logger.debug.bind(Logger)