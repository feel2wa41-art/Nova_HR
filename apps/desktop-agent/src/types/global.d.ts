// Global type definitions for Nova HR Desktop Agent

interface ElectronAPI {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) => Promise<any>
    logout: () => Promise<any>
    getUser: () => Promise<any>
    isAuthenticated: () => Promise<boolean>
  }

  // Screenshots
  screenshot: {
    take: () => Promise<any>
    getHistory: (params?: any) => Promise<any>
  }

  // Activity Monitoring
  activity: {
    start: () => Promise<any>
    stop: () => void
    getStats: () => Promise<any>
  }

  // Settings
  settings: {
    get: () => any
    set: (settings: any) => void
  }

  // System
  system: {
    getInfo: () => any
    openExternal: (url: string) => void
  }

  // App Controls
  app: {
    minimize: () => void
    hide: () => void
    quit: () => void
    restart: () => void
  }

  // System Information
  systemInfo: {
    getProcesses: () => Promise<any>
    getNetworkInfo: () => Promise<any>
    getSystemStats: () => Promise<any>
    getHealthSummary: () => Promise<any>
    collectProcesses: () => Promise<any>
    collectNetwork: () => Promise<any>
    startProcessCollection: (intervalMinutes?: number) => Promise<any>
    startNetworkMonitoring: (intervalMinutes?: number) => Promise<any>
    stopAllCollections: () => Promise<any>
  }

  // Idle Detection
  idle: {
    getStatus: () => any
    getSystemIdleTime: () => any
    setThreshold: (seconds: number) => Promise<any>
    triggerManually: () => Promise<any>
    endManually: () => Promise<any>
    getStats: (days?: number) => Promise<any>
    captureProcesses: () => Promise<any>
  }

  // Auto Launch
  autoLaunch: {
    isEnabled: () => Promise<boolean>
    enable: () => Promise<any>
    disable: () => Promise<any>
    getSettings: () => any
    updateSettings: (settings: any) => Promise<any>
    getInfo: () => any
    test: () => Promise<any>
    createDesktopShortcut: () => Promise<any>
  }

  // Secure Credentials
  credentials: {
    save: (credentials: any) => Promise<any>
    get: () => Promise<any>
    autoLogin: () => Promise<any>
    validatePassword: (password: string) => Promise<any>
    updateTokens: (apiToken: string, refreshToken: string) => Promise<any>
    clear: () => Promise<any>
    hasStored: () => Promise<boolean>
    getLastLogin: () => any
    test: () => Promise<any>
    getStorageInfo: () => any
  }

  // Event Listeners
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (event: string) => void

  // IPC Communication
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
}

interface ProcessInfo {
  platform: string
  arch: string
  versions: any
  env: {
    NODE_ENV?: string
  }
}

interface PathUtils {
  join: (...paths: string[]) => string
  basename: (path: string) => string
  dirname: (path: string) => string
  extname: (path: string) => string
}

interface Utils {
  formatFileSize: (bytes: number) => string
  formatDuration: (ms: number) => string
  formatDate: (date: Date | string | number) => string
  formatDateTime: (date: Date | string | number) => string
  generateId: () => string
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => (...args: Parameters<T>) => void
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => (...args: Parameters<T>) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    process: ProcessInfo
    path: PathUtils
    utils: Utils
  }
}

export {}