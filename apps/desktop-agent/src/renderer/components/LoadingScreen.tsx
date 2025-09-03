import React from 'react'

export const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>
          Nova HR
        </div>
        <div style={{ fontSize: '16px', color: '#6c757d' }}>
          Desktop Agent
        </div>
      </div>
      
      <div className="spinner" />
      
      <div style={{ marginTop: '24px', fontSize: '14px', color: '#6c757d' }}>
        Initializing application...
      </div>
    </div>
  )
}