import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import logoSrc from '../../logo/logo.png'

export const LoginPage: React.FC = () => {
  const { login, loading } = useAuth()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email format is invalid'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const result = await login(formData)
      
      if (result.success) {
        showNotification('Login Successful', 'Welcome to HR Desktop Agent!', 'success')
      } else {
        showNotification('Login Failed', result.error || 'Invalid credentials', 'error')
      }
    } catch (error: any) {
      showNotification('Login Error', error.message || 'Network error occurred', 'error')
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ marginBottom: '16px' }}>
            <img 
              src={logoSrc} 
              alt="Reko HR Logo" 
              style={{ 
                width: '80px', 
                height: '80px', 
                objectFit: 'contain',
                borderRadius: '8px'
              }} 
            />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px' }}>
            Reko HR
          </div>
          <div style={{ fontSize: '16px', color: '#6c757d' }}>
            Desktop Agent Login
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${formErrors.email ? 'error' : ''}`}
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
            />
            {formErrors.email && (
              <div className="form-error">{formErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${formErrors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
            {formErrors.password && (
              <div className="form-error">{formErrors.password}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#6c757d' }}>
          <div>Test Accounts:</div>
          <div>admin@reko-hr.com / admin123</div>
          <div>employee@reko-hr.com / admin123</div>
        </div>
      </div>
    </div>
  )
}