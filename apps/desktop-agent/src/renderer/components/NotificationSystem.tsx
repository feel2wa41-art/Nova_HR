import React from 'react'
import { useNotification } from '../contexts/NotificationContext'

export const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useNotification()

  return (
    <div className="notifications">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification ${notification.type}`}
        >
          <div className="notification-header">
            <div className="notification-title">{notification.title}</div>
            <button
              className="notification-close"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
          <div className="notification-message">{notification.message}</div>
          {notification.action && (
            <div style={{ marginTop: '8px' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={notification.action.handler}
                style={{ fontSize: '12px' }}
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}