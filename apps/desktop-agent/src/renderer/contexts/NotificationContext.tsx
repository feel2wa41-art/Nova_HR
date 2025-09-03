import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (title: string, message: string, type?: Notification['type'], duration?: number) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    duration: number = 5000
  ) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const notification: Notification = {
      id,
      title,
      message,
      type,
      duration
    }

    setNotifications(prev => [...prev, notification])

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const value: NotificationContextType = {
    notifications,
    showNotification,
    removeNotification,
    clearAll
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}