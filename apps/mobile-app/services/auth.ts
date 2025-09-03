import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3005/api/v1';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    employee_profile?: {
      base_location?: {
        id: string;
        name: string;
        lat: number;
        lng: number;
        radius_m: number;
      };
    };
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      
      // Store tokens securely
      if (response.data.accessToken) {
        await SecureStore.setItemAsync('accessToken', response.data.accessToken);
      }
      if (response.data.refreshToken) {
        await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear stored tokens
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
  },

  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('accessToken');
  },

  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) return null;

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      });

      const newAccessToken = response.data.accessToken;
      await SecureStore.setItemAsync('accessToken', newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear invalid tokens
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      return null;
    }
  }
};