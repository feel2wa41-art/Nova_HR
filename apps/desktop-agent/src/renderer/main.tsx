import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotificationSystem } from './components/NotificationSystem'
import './styles/global.css'

// Get the root element
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

// Create root
const root = createRoot(container)

// Main application component with all providers
const MainApp: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <NotificationProvider>
            <App />
            <NotificationSystem />
          </NotificationProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

// Render the app
root.render(<MainApp />)

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development') {
  if (module.hot) {
    module.hot.accept('./App', () => {
      // Re-render the app when App.tsx changes
      const NextApp = require('./App').App
      root.render(
        <ErrorBoundary>
          <AuthProvider>
            <SettingsProvider>
              <NotificationProvider>
                <NextApp />
                <NotificationSystem />
              </NotificationProvider>
            </SettingsProvider>
          </AuthProvider>
        </ErrorBoundary>
      )
    })
  }
}

// Handle app lifecycle events from main process
window.electronAPI?.on('app:prepare-quit', () => {
  console.log('App is preparing to quit')
  // Perform cleanup tasks
})

window.electronAPI?.on('monitoring:started', () => {
  console.log('Monitoring started from main process')
})

window.electronAPI?.on('monitoring:stopped', () => {
  console.log('Monitoring stopped from main process')
})

// Development helpers
if (process.env.NODE_ENV === 'development') {
  // Add global access to electronAPI for debugging
  ;(window as any).__electronAPI = window.electronAPI
  
  // Add performance monitoring
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        console.log(`Performance: ${entry.name} took ${entry.duration}ms`)
      }
    })
  })
  
  try {
    observer.observe({ entryTypes: ['measure', 'navigation'] })
  } catch (error) {
    console.warn('Performance observer not supported:', error)
  }
}

console.log('Nova HR Desktop Agent renderer started')