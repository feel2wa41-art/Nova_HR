import axios from 'axios';
import { authService } from './auth';

const API_BASE_URL = 'http://localhost:3005/api/v1';

export interface CheckInRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  reasonCode?: string;
  reasonText?: string;
  isRemote?: boolean;
}

export interface CheckOutRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  reasonText?: string;
}

export interface AttendanceRequestDto {
  requestType: 'CHECK_IN' | 'CHECK_OUT' | 'ADJUST';
  targetAt: string;
  reasonCode?: string;
  reasonText: string;
  attachUrls?: string[];
  geoSnapshot?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
  };
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date_key: string;
  check_in_at?: string;
  check_out_at?: string;
  check_in_loc?: any;
  check_out_loc?: any;
  work_minutes?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceResponse {
  success: boolean;
  attendance: AttendanceRecord;
  geofence?: {
    distance: number;
    location: string;
  };
  workMinutes?: number;
  workHours?: string;
}

// Create axios instance with interceptor for token management
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(async (config) => {
    const token = await authService.getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor to handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Try to refresh token
        const newToken = await authService.refreshToken();
        if (newToken && error.config) {
          // Retry the request with new token
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return client.request(error.config);
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export const attendanceService = {
  async checkIn(data: CheckInRequest): Promise<AttendanceResponse> {
    const client = createApiClient();
    try {
      const response = await client.post('/attendance/check-in', data);
      return response.data;
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  },

  async checkOut(data: CheckOutRequest): Promise<AttendanceResponse> {
    const client = createApiClient();
    try {
      const response = await client.post('/attendance/check-out', data);
      return response.data;
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  },

  async getTodayAttendance(): Promise<AttendanceRecord | null> {
    const client = createApiClient();
    try {
      const response = await client.get('/attendance/today');
      return response.data;
    } catch (error) {
      console.error('Failed to get today attendance:', error);
      return null;
    }
  },

  async getAttendanceHistory(params: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    data: AttendanceRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const client = createApiClient();
    try {
      const response = await client.get('/attendance/history', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get attendance history:', error);
      throw error;
    }
  },

  async createAttendanceRequest(data: AttendanceRequestDto): Promise<any> {
    const client = createApiClient();
    try {
      const response = await client.post('/attendance/requests', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create attendance request:', error);
      throw error;
    }
  },

  async getAttendanceRequests(params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const client = createApiClient();
    try {
      const response = await client.get('/attendance/requests', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get attendance requests:', error);
      throw error;
    }
  }
};