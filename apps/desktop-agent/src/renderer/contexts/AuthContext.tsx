import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
  title?: string
  company?: {
    id: string
    name: string
  }
  employee_profile?: {
    department?: string
    emp_no?: string
  }
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initialize: () => Promise<void>
  updateUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!user

  const initialize = async () => {
    setLoading(true)
    try {
      console.log('Initializing auth context...')
      
      // Check if user is already authenticated
      const authenticated = await window.electronAPI.auth.isAuthenticated()
      
      if (authenticated) {
        const userData = await window.electronAPI.auth.getUser()
        if (userData) {
          setUser(userData)
          console.log('User restored from storage:', userData.email)
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      // Clear any stale auth data
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true)
    try {
      console.log('Attempting login for:', credentials.email)
      
      const response = await window.electronAPI.auth.login(credentials)
      
      if (response.success && response.data) {
        setUser(response.data.user)
        console.log('Login successful for:', response.data.user.email)
        return { success: true }
      } else {
        console.error('Login failed:', response.error)
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.message || 'Network error' 
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      console.log('Logging out user:', user?.email)
      
      await window.electronAPI.auth.logout()
      setUser(null)
      
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear user data even if API call fails
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async () => {
    if (!isAuthenticated) return

    try {
      const userData = await window.electronAPI.auth.getUser()
      if (userData) {
        setUser(userData)
        console.log('User data updated')
      }
    } catch (error) {
      console.error('Failed to update user data:', error)
    }
  }

  // Auto-refresh user data periodically
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      updateUser()
    }, 15 * 60 * 1000) // Every 15 minutes

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Handle auth state changes from main process
  useEffect(() => {
    const handleAuthStateChange = (authenticated: boolean) => {
      if (!authenticated && user) {
        setUser(null)
        console.log('User session expired')
      }
    }

    // Listen for auth state changes
    window.electronAPI?.on('auth:state-changed', handleAuthStateChange)

    return () => {
      window.electronAPI?.off('auth:state-changed', handleAuthStateChange)
    }
  }, [user])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    initialize,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hooks
export const useUser = () => {
  const { user } = useAuth()
  return user
}

export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

export const useUserRole = () => {
  const { user } = useAuth()
  return user?.role
}

export const useUserCompany = () => {
  const { user } = useAuth()
  return user?.company
}

export const useEmployeeProfile = () => {
  const { user } = useAuth()
  return user?.employee_profile
}