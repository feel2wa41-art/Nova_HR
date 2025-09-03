import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log error to main process
    if (window.electronAPI?.logger?.error) {
      window.electronAPI.logger.error('Renderer Error', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        }
      })
    }

    this.setState({
      error,
      errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRestart = () => {
    if (window.electronAPI?.app?.restart) {
      window.electronAPI.app.restart()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c', marginBottom: '8px' }}>
              Application Error
            </div>
            <div style={{ fontSize: '16px', color: '#6c757d' }}>
              Something went wrong in the Nova HR Desktop Agent
            </div>
          </div>

          <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-content">
              <div style={{ marginBottom: '16px' }}>
                <strong>Error Details:</strong>
              </div>
              <div style={{
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px',
                textAlign: 'left',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <div style={{ color: '#721c24', marginBottom: '8px' }}>
                  <strong>{this.state.error?.name}:</strong> {this.state.error?.message}
                </div>
                {this.state.error?.stack && (
                  <div style={{ color: '#721c24', fontSize: '12px', opacity: 0.8 }}>
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={this.handleReload}
                >
                  Reload Application
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={this.handleRestart}
                >
                  Restart Application
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '12px', color: '#6c757d' }}>
                If the problem persists, please contact your system administrator
                or check the application logs for more information.
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}