import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('provider_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('provider_admin_token');
      localStorage.removeItem('provider_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface CompanyRequest {
  id: string;
  company_name: string;
  business_number?: string;
  ceo_name: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  description?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  registrar?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface Company {
  id: string;
  name: string;
  business_number?: string;
  ceo_name: string;
  phone: string;
  email: string;
  address?: string;
  address_detail?: string;
  industry?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  userCount?: number;
  monthlyRevenue?: number;
  joinDate: string;
  lastActive?: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    status: string;
    plan: string;
    max_users: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  department?: string;
  position?: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  company_id: string;
}

// Auth APIs
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/api/v1/auth/login', credentials);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/v1/auth/profile');
    return response.data;
  },
};

// Company Registration APIs
export const companyAPI = {
  getRegistrationRequests: async (): Promise<CompanyRequest[]> => {
    const response = await api.get('/api/v1/company-requests');
    return response.data.data || [];
  },

  approveRegistration: async (requestId: string, notes?: string) => {
    const response = await api.post(`/api/v1/company-requests/${requestId}/approve`, {
      notes,
    });
    return response.data;
  },

  rejectRegistration: async (requestId: string, notes?: string) => {
    const response = await api.post(`/api/v1/company-requests/${requestId}/reject`, {
      notes,
    });
    return response.data;
  },

  getAllCompanies: async (): Promise<Company[]> => {
    const response = await api.get('/api/v1/company/all');
    return response.data;
  },

  getCompanyById: async (companyId: string): Promise<Company> => {
    const response = await api.get(`/api/v1/company/${companyId}`);
    return response.data;
  },

  // 기업 직접 추가 (임시 요청 생성 후 즉시 승인)
  createCompany: async (companyData: {
    name: string;
    business_number?: string;
    ceo_name: string;
    contact_email: string;
    contact_phone: string;
    address?: string;
    address_detail?: string;
    industry?: string;
    plan?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
    description?: string;
  }) => {
    // 1. 먼저 company-request 생성
    const requestData = {
      company_name: companyData.name,
      business_number: companyData.business_number,
      ceo_name: companyData.ceo_name,
      contact_email: companyData.contact_email,
      contact_phone: companyData.contact_phone,
      address: companyData.address,
      description: companyData.description,
      notes: `업종: ${companyData.industry || 'N/A'}, 요금제: ${companyData.plan || 'BASIC'}, 직접생성됨`
    };
    
    // 2. 공개 엔드포인트로 요청 생성
    const createResponse = await api.post('/api/v1/company-requests', requestData);
    const requestId = createResponse.data.request_id;
    
    // 3. 생성된 요청을 즉시 승인
    const approveResponse = await api.post(`/api/v1/company-requests/${requestId}/approve`, {
      notes: '직접 생성된 기업'
    });
    
    return {
      ...approveResponse.data,
      message: '기업이 성공적으로 생성되었습니다',
      creationType: 'DIRECT_CREATE'
    };
  },
};

// User Management APIs
export const userAPI = {
  getCompanyUsers: async (companyId: string): Promise<User[]> => {
    const response = await api.get(`/api/v1/company/${companyId}/users`);
    return response.data;
  },

  createUser: async (userData: Partial<User>) => {
    const response = await api.post('/api/v1/users', userData);
    return response.data;
  },

  updateUser: async (userId: string, userData: Partial<User>) => {
    const response = await api.put(`/api/v1/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/api/v1/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId: string, status: string) => {
    const response = await api.patch(`/api/v1/users/${userId}/status`, { status });
    return response.data;
  },

  resetPassword: async (userId: string) => {
    const response = await api.post(`/api/v1/users/${userId}/reset-password`);
    return response.data;
  },
};

export default api;