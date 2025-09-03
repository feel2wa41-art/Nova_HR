import Store from 'electron-store'
import { ApiService, ApiResponse } from './ApiService'

export interface User {
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

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthState {
  token: string | null
  refreshToken: string | null
  user: User | null
}

export class AuthService {
  private apiService: ApiService
  private store: Store

  constructor(apiService: ApiService, store: Store) {
    this.apiService = apiService
    this.store = store
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: any }>> {
    try {
      const response = await this.apiService.login(credentials)
      
      if (response.success && response.data) {
        // Store authentication data
        const authData: AuthState = {
          token: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user
        }
        
        this.store.set('auth', authData)
        
        console.log('User logged in:', response.data.user.email)
        
        return {
          success: true,
          data: {
            user: response.data.user,
            tokens: {
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              expiresIn: response.data.expiresIn
            }
          }
        }
      }
      
      return response
    } catch (error: any) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.message || 'Login failed'
      }
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      // Call logout API
      const response = await this.apiService.logout()
      
      // Clear local auth data regardless of API response
      this.clearAuthData()
      
      console.log('User logged out')
      
      return { success: true }
    } catch (error: any) {
      console.error('Logout error:', error)
      // Still clear local data even if API call fails
      this.clearAuthData()
      return {
        success: false,
        error: error.message || 'Logout failed'
      }
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const auth = this.getAuthState()
      if (!auth.refreshToken) {
        return false
      }

      // The API service handles token refresh internally
      const response = await this.apiService.getCurrentUser()
      
      if (response.success) {
        // Update user data
        const currentAuth = this.getAuthState()
        this.store.set('auth', {
          ...currentAuth,
          user: response.data
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  getCurrentUser(): User | null {
    const auth = this.getAuthState()
    return auth.user
  }

  getAuthToken(): string | null {
    const auth = this.getAuthState()
    return auth.token
  }

  getRefreshToken(): string | null {
    const auth = this.getAuthState()
    return auth.refreshToken
  }

  isAuthenticated(): boolean {
    const auth = this.getAuthState()
    return !!(auth.token && auth.user)
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser()
    return user ? roles.includes(user.role) : false
  }

  async updateUserProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.apiService.getCurrentUser()
      
      if (response.success && response.data) {
        // Update stored user data
        const currentAuth = this.getAuthState()
        this.store.set('auth', {
          ...currentAuth,
          user: response.data
        })
        
        return {
          success: true,
          data: response.data
        }
      }
      
      return response
    } catch (error: any) {
      console.error('Update user profile error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update user profile'
      }
    }
  }

  private getAuthState(): AuthState {
    const auth = this.store.get('auth') as AuthState
    return auth || { token: null, refreshToken: null, user: null }
  }

  private clearAuthData(): void {
    this.store.set('auth', {
      token: null,
      refreshToken: null,
      user: null
    })
  }

  // Event handlers for auth state changes
  onAuthStateChange(callback: (authenticated: boolean, user: User | null) => void): void {
    // This would be implemented with an event emitter in a full implementation
    // For now, this is a placeholder
  }

  // Validate stored token
  async validateStoredToken(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false
    }

    try {
      const response = await this.apiService.getCurrentUser()
      
      if (response.success) {
        // Update user data
        const currentAuth = this.getAuthState()
        this.store.set('auth', {
          ...currentAuth,
          user: response.data
        })
        return true
      } else {
        // Token is invalid, clear auth data
        this.clearAuthData()
        return false
      }
    } catch (error) {
      console.error('Token validation error:', error)
      this.clearAuthData()
      return false
    }
  }

  // Get user permissions
  getUserPermissions(): string[] {
    const user = this.getCurrentUser()
    // This would typically come from the user object or be fetched separately
    return user?.permissions || []
  }

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions()
    return permissions.includes(permission)
  }

  // Get company information
  getUserCompany(): { id: string; name: string } | null {
    const user = this.getCurrentUser()
    return user?.company || null
  }

  // Get employee information
  getEmployeeProfile(): { department?: string; emp_no?: string } | null {
    const user = this.getCurrentUser()
    return user?.employee_profile || null
  }

  // Auto-login check (for remembered sessions)
  async autoLogin(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false
    }

    try {
      // Validate existing token
      const isValid = await this.validateStoredToken()
      
      if (isValid) {
        console.log('Auto-login successful for:', this.getCurrentUser()?.email)
        return true
      } else {
        console.log('Auto-login failed: invalid token')
        return false
      }
    } catch (error) {
      console.error('Auto-login error:', error)
      return false
    }
  }

  // Get authentication headers for manual API calls
  getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Check if token is about to expire (for proactive refresh)
  isTokenExpiring(): boolean {
    // This would require storing token expiration time
    // For now, return false (token refresh is handled by interceptors)
    return false
  }
}