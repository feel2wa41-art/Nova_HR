import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import Store from 'electron-store'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export class ApiService {
  private api: AxiosInstance
  private store: Store
  private baseURL: string

  constructor(store: Store) {
    this.store = store
    this.baseURL = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/api' 
      : 'https://api.nova-hr.com'

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
            console.error('Token refresh failed:', refreshError)
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
      console.error('Token refresh error:', error)
      return false
    }
  }

  // Authentication
  async login(credentials: { email: string; password: string }): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/auth/login', credentials)
      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
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

  // Screenshot upload
  async uploadScreenshot(imageBuffer: Buffer, metadata: any): Promise<ApiResponse> {
    try {
      const formData = new FormData()
      const blob = new Blob([imageBuffer], { type: 'image/png' })
      formData.append('screenshot', blob, `screenshot-${Date.now()}.png`)
      formData.append('metadata', JSON.stringify(metadata))

      const response = await this.api.post('/attitude/screenshots', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      return { success: true, data: response.data }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Screenshot upload failed'
      }
    }
  }

  // Activity tracking
  async submitActivity(activityData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/attitude/activity', activityData)
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

  // Attendance
  async checkIn(locationData: any): Promise<ApiResponse> {
    try {
      const response = await this.api.post('/attendance/check-in', locationData)
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
      const response = await this.api.post('/attendance/check-out', locationData)
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