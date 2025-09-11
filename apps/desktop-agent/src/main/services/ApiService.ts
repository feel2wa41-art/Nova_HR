import axios, { AxiosInstance } from 'axios'
import Store from 'electron-store'
import { Logger } from '../utils/logger'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
  retryCount?: number
}

export class ApiService {
  private api: AxiosInstance
  private store: Store
  private baseURL: string

  constructor(store: Store) {
    this.store = store
    // Use environment variable for API URL, fallback to localhost
    const apiUrl = process.env.API_URL || 'http://localhost:3000'
    this.baseURL = `${apiUrl}/api/v1`

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Nova-HR-Desktop-Agent/${process.env.APP_VERSION || '1.0.0'}`
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.api.interceptors.request.use(
      (config) => {
        const auth = this.store.get('auth') as any
        if (auth?.token) {
          config.headers.Authorization = `Bearer ${auth.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshed = await this.refreshToken()
            if (refreshed) {
              const auth = this.store.get('auth') as any
              originalRequest.headers.Authorization = `Bearer ${auth.token}`
              return this.api(originalRequest)
            }
          } catch (refreshError) {
            Logger.error('Token refresh failed:', refreshError)
            // Clear auth data
            this.store.set('auth', { token: null, refreshToken: null, user: null })
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const auth = this.store.get('auth') as any
      if (!auth?.refreshToken) {
        return false
      }

      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refreshToken: auth.refreshToken
      })

      if (response.data.accessToken) {
        this.store.set('auth', {
          ...auth,
          token: response.data.accessToken
        })
        return true
      }

      return false
    } catch (error) {
      Logger.error('Token refresh error:', error)
      return false
    }
  }

  // Authentication
  async login(credentials: { email: string; password: string }): Promise<ApiResponse> {
    try {
      Logger.log('ApiService: Making login request to:', `${this.baseURL}/auth/login`)
      Logger.log('ApiService: Request data:', { email: credentials.email, password: '[HIDDEN]' })
      
      const response = await this.api.post('/auth/login', credentials)
      
      Logger.log('ApiService: Login response status:', response.status)
      Logger.log('ApiService: Login response data:', response.data)
      
      return { success: true, data: response.data }
    } catch (error: any) {
      Logger.error('ApiService: Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      })
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed',
        status: error.response?.status
      }
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      await this.api.post('/auth/logout')
      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Logout failed'
      }
    }
  }

  async getCurrentUser(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/auth/profile')
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get user profile'
      }
    }
  }

  // Screenshot upload with company isolation and retry logic
  async uploadScreenshot(imageBuffer: Buffer, metadata: any, retryCount: number = 0): Promise<ApiResponse> {
    const maxRetries = 3
    try {
      const auth = this.store.get('auth') as any
      if (!auth?.user?.tenant?.id) {
        return {
          success: false,
          error: 'Company information not found'
        }
      }

      const formData = new FormData()
      const blob = new Blob([new Uint8Array(imageBuffer)], { 
        type: metadata?.format === 'jpeg' ? 'image/jpeg' : 'image/png' 
      })
      formData.append('screenshot', blob, `screenshot-${Date.now()}.${metadata?.format || 'png'}`)
      
      // Include user info in metadata (tenant isolation handled by JWT on server)
      const enrichedMetadata = {
        ...metadata,
        userId: auth.user.id,
        userName: auth.user.name,
        userEmail: auth.user.email,
        department: auth.user.employee_profile?.department,
        timestamp: new Date().toISOString(),
        uploadAttempt: retryCount + 1
      }
      
      formData.append('metadata', JSON.stringify(enrichedMetadata))

      const response = await this.api.post('/attitude/screenshots/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000, // 30 second timeout
      })

      console.log('Screenshot upload successful:', response.data?.id)
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error(`Screenshot upload attempt ${retryCount + 1} failed:`, error?.response?.data || error.message)
      
      // Retry on network errors or temporary server issues
      const shouldRetry = retryCount < maxRetries && (
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.response?.status >= 500 ||
        error.response?.status === 429 // Rate limit
      )

      if (shouldRetry) {
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.uploadScreenshot(imageBuffer, metadata, retryCount + 1)
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Screenshot upload failed',
        retryCount: retryCount + 1
      }
    }
  }

  // Activity tracking with company isolation
  async submitActivity(activityData: any): Promise<ApiResponse> {
    try {
      const auth = this.store.get('auth') as any
      if (!auth?.user?.id) {
        return {
          success: false,
          error: 'User information not found'
        }
      }

      // Enrich activity data with user info (tenant isolation handled by JWT on server)
      const enrichedActivityData = {
        ...activityData,
        userId: auth.user.id,
        userName: auth.user.name,
        department: auth.user.employee_profile?.department,
        timestamp: new Date().toISOString()
      }

      const response = await this.api.post('/attitude/activity', enrichedActivityData)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Activity submission failed'
      }
    }
  }

  async getActivityStats(params?: any): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/attitude/statistics', { params })
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get activity stats'
      }
    }
  }

  // Screenshot history
  async getScreenshotHistory(params?: any): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/attitude/screenshots', { params })
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get screenshot history'
      }
    }
  }

  // App usage tracking
  async submitAppUsage(usageData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/attitude/app-usage', usageData)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'App usage submission failed'
      }
    }
  }

  // Attendance with company isolation
  async checkIn(locationData: any): Promise<ApiResponse> {
    try {
      const auth = this.store.get('auth') as any
      if (!auth?.user?.id) {
        return {
          success: false,
          error: 'User information not found'
        }
      }

      // Enrich location data with user info (tenant isolation handled by JWT on server)
      const enrichedLocationData = {
        ...locationData,
        userId: auth.user.id,
        userName: auth.user.name,
        department: auth.user.employee_profile?.department,
        timestamp: new Date().toISOString()
      }

      const response = await this.api.post('/attendance/check-in', enrichedLocationData)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Check-in failed'
      }
    }
  }

  async checkOut(locationData: any): Promise<ApiResponse> {
    try {
      const auth = this.store.get('auth') as any
      if (!auth?.user?.id) {
        return {
          success: false,
          error: 'User information not found'
        }
      }

      // Enrich location data with user info (tenant isolation handled by JWT on server)
      const enrichedLocationData = {
        ...locationData,
        userId: auth.user.id,
        userName: auth.user.name,
        department: auth.user.employee_profile?.department,
        timestamp: new Date().toISOString()
      }

      const response = await this.api.post('/attendance/check-out', enrichedLocationData)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Check-out failed'
      }
    }
  }

  async getAttendanceStatus(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/attendance/current-status')
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get attendance status'
      }
    }
  }

  // Generic methods
  async get(endpoint: string, params?: any): Promise<ApiResponse> {
    try {
      const response = await this.api.get(endpoint, { params })
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || `GET ${endpoint} failed`,
        status: error.response?.status
      }
    }
  }

  async post(endpoint: string, data?: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post(endpoint, data)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || `POST ${endpoint} failed`,
        status: error.response?.status
      }
    }
  }

  async put(endpoint: string, data?: any): Promise<ApiResponse> {
    try {
      const response = await this.api.put(endpoint, data)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || `PUT ${endpoint} failed`,
        status: error.response?.status
      }
    }
  }

  async delete(endpoint: string): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(endpoint)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || `DELETE ${endpoint} failed`,
        status: error.response?.status
      }
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health', { timeout: 5000 })
      return response.status === 200
    } catch (error) {
      return false
    }
  }

  // App Whitelist Management
  async getAppWhitelist(): Promise<ApiResponse> {
    try {
      const response = await this.api.get('/attitude/app-whitelist')
      return { success: true, data: response.data }
    } catch (error: any) {
      Logger.error('ApiService: Failed to get app whitelist:', error)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get app whitelist'
      }
    }
  }

  // Update base URL (for switching environments)
  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL
    this.api.defaults.baseURL = newBaseURL
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL
  }
}