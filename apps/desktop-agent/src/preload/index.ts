import { contextBridge, ipcRenderer } from 'electron'

// Types for the exposed API
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

  // Event Listeners
  on: (event: string, callback: (...args: any[]) => void) => void
  off: (event: string, callback: (...args: any[]) => void) => void
  removeAllListeners: (event: string) => void

  // IPC Communication
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
}

// Define the API object
const electronAPI: ElectronAPI = {
  // Authentication methods
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated')
  },

  // Screenshot methods
  screenshot: {
    take: () => ipcRenderer.invoke('screenshot:take'),
    getHistory: (params) => ipcRenderer.invoke('screenshot:getHistory', params)
  },

  // Activity monitoring methods
  activity: {
    start: () => ipcRenderer.invoke('activity:start'),
    stop: () => ipcRenderer.invoke('activity:stop'),
    getStats: () => ipcRenderer.invoke('activity:getStats')
  },

  // Settings methods
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings)
  },

  // System methods
  system: {
    getInfo: () => ipcRenderer.invoke('system:getInfo'),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },

  // App control methods
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    hide: () => ipcRenderer.invoke('app:hide'),
    quit: () => ipcRenderer.invoke('app:quit'),
    restart: () => ipcRenderer.invoke('app:restart')
  },

  // Event listener methods
  on: (event, callback) => {
    ipcRenderer.on(event, (_event, ...args) => callback(...args))
  },

  off: (event, callback) => {
    ipcRenderer.removeListener(event, callback)
  },

  removeAllListeners: (event) => {
    ipcRenderer.removeAllListeners(event)
  },

  // Generic IPC methods
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args)
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Also expose some Node.js process information
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions,
  env: {
    NODE_ENV: process.env.NODE_ENV
  }
})

// Expose path utilities (safe subset)
contextBridge.exposeInMainWorld('path', {
  join: (...paths: string[]) => paths.join('/'),
  basename: (path: string) => path.split('/').pop() || path,
  dirname: (path: string) => {
    const parts = path.split('/')
    parts.pop()
    return parts.join('/')
  },
  extname: (path: string) => {
    const parts = path.split('.')
    return parts.length > 1 ? '.' + parts.pop() : ''
  }
})

// Additional utilities for the renderer
contextBridge.exposeInMainWorld('utils', {
  // Format file size
  formatFileSize: (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Byte'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  },

  // Format duration
  formatDuration: (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  },

  // Format date
  formatDate: (date: Date | string | number) => {
    return new Date(date).toLocaleDateString()
  },

  // Format date and time
  formatDateTime: (date: Date | string | number) => {
    return new Date(date).toLocaleString()
  },

  // Generate UUID (simple version)
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  },

  // Debounce function
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  // Throttle function
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }
})

// Security: Remove Node.js globals from the renderer context
delete (globalThis as any).global
delete (globalThis as any).Buffer
delete (globalThis as any).process
delete (globalThis as any).setImmediate
delete (globalThis as any).clearImmediate

// Add CSP headers for additional security
const meta = document.createElement('meta')
meta.httpEquiv = 'Content-Security-Policy'
meta.content = "default-src 'self' 'unsafe-inline' data: https://api.nova-hr.com https://nova-hr.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
document.head.appendChild(meta)

// Log that preload script has loaded
console.log('Nova HR Desktop Agent preload script loaded')

// Export types for TypeScript support in renderer
export type { ElectronAPI }