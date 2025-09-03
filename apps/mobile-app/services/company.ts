import axios from 'axios';
import { authService } from './auth';

const API_BASE_URL = 'http://localhost:3005/api/v1';

export interface CompanyLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius_m: number;
  is_active: boolean;
  company_id: string;
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

export const companyService = {
  async getCompanyLocations(): Promise<CompanyLocation[]> {
    const client = createApiClient();
    try {
      const response = await client.get('/company/locations');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get company locations:', error);
      // Return empty array as fallback
      return [];
    }
  },

  async getUserProfile(): Promise<any> {
    const client = createApiClient();
    try {
      const response = await client.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }
};