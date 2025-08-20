import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nova_hr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove tokens and redirect to login
      localStorage.removeItem('nova_hr_token');
      localStorage.removeItem('nova_hr_refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    title?: string;
    permissions?: string[];
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// Auth API
export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiClient.post('/auth/login', data).then(res => res.data),
  
  refresh: (data: RefreshTokenRequest): Promise<RefreshTokenResponse> =>
    apiClient.post('/auth/refresh', data).then(res => res.data),
  
  getProfile: () =>
    apiClient.get('/auth/profile').then(res => res.data),
  
  logout: () =>
    apiClient.post('/auth/logout').then(res => res.data),
};

// Mock login for testing without backend
export const mockLogin = async (email: string, password: string): Promise<LoginResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock user data
  const mockUsers = {
    'employee@nova-hr.com': {
      id: '1',
      email: 'employee@nova-hr.com',
      name: '홍길동',
      role: 'EMPLOYEE',
      title: '시니어 개발자',
      permissions: ['view_own_attendance', 'apply_leave', 'view_own_profile']
    },
    'hr@nova-hr.com': {
      id: '2',
      email: 'hr@nova-hr.com',
      name: '김인사',
      role: 'HR_MANAGER',
      title: 'HR 매니저',
      permissions: [
        'view_own_attendance', 'apply_leave', 'view_own_profile',
        'manage_users', 'view_all_attendance', 'manage_leaves',
        'manage_company_settings', 'view_reports'
      ]
    },
    'admin@nova-hr.com': {
      id: '3',
      email: 'admin@nova-hr.com',
      name: '시스템 관리자',
      role: 'SUPER_ADMIN',
      title: 'IT 관리자',
      permissions: [
        'view_own_attendance', 'apply_leave', 'view_own_profile',
        'manage_users', 'view_all_attendance', 'manage_leaves',
        'manage_company_settings', 'view_reports', 'system_admin',
        'manage_locations', 'manage_work_policies', 'manage_approval_routes'
      ]
    },
  };

  const user = mockUsers[email as keyof typeof mockUsers];
  
  if (!user || password !== 'admin123') {
    throw new Error('Invalid credentials');
  }

  return {
    user,
    accessToken: 'mock_access_token_' + user.id,
    refreshToken: 'mock_refresh_token_' + user.id,
    expiresIn: 900, // 15 minutes
  };
};