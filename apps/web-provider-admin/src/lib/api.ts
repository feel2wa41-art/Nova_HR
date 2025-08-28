import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
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
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  userCount?: number;
  monthlyRevenue?: number;
  joinDate: string;
  lastActive?: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    status: string;
    plan: string;
    max_users: number;
  };
}

// Auth APIs
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

// Company Registration APIs
export const companyAPI = {
  getRegistrationRequests: async (): Promise<CompanyRequest[]> => {
    const response = await api.get('/company/registration-requests');
    return response.data;
  },

  approveRegistration: async (requestId: string, notes?: string) => {
    const response = await api.post(`/company/registration-requests/${requestId}/approve`, {
      notes,
    });
    return response.data;
  },

  rejectRegistration: async (requestId: string, notes?: string) => {
    const response = await api.post(`/company/registration-requests/${requestId}/reject`, {
      notes,
    });
    return response.data;
  },

  getAllCompanies: async (): Promise<Company[]> => {
    const response = await api.get('/company/all');
    return response.data;
  },
};

export default api;