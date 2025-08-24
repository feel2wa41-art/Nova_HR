import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      const refreshToken = localStorage.getItem('nova_hr_refresh_token');
      if (refreshToken) {
        try {
          const response = await authApi.refresh({ refreshToken });
          localStorage.setItem('nova_hr_token', response.accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect
          localStorage.removeItem('nova_hr_token');
          localStorage.removeItem('nova_hr_refresh_token');
          
          // Use React Router navigate instead of window.location
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // No refresh token, clear tokens and redirect
        localStorage.removeItem('nova_hr_token');
        localStorage.removeItem('nova_hr_refresh_token');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
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

// Attendance API
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

export interface AttendanceHistoryRequest {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceHistoryResponse {
  data: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const attendanceApi = {
  checkIn: (data: CheckInRequest): Promise<AttendanceResponse> =>
    apiClient.post('/attendance/check-in', data).then(res => res.data),
    
  checkOut: (data: CheckOutRequest): Promise<AttendanceResponse> =>
    apiClient.post('/attendance/check-out', data).then(res => res.data),
    
  getTodayAttendance: (): Promise<AttendanceRecord | null> =>
    apiClient.get('/attendance/today').then(res => res.data),
    
  getAttendanceHistory: (params: AttendanceHistoryRequest): Promise<AttendanceHistoryResponse> =>
    apiClient.get('/attendance/history', { params }).then(res => res.data),
    
  createAttendanceRequest: (data: any): Promise<any> =>
    apiClient.post('/attendance/requests', data).then(res => res.data),
    
  getAttendanceRequests: (params: { page?: number; limit?: number }): Promise<any> =>
    apiClient.get('/attendance/requests', { params }).then(res => res.data),
};

// Company API
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

export const companyApi = {
  getLocations: (): Promise<CompanyLocation[]> =>
    apiClient.get('/company/locations').then(res => res.data.data || []),
};

// Approval API
export interface ApprovalCategory {
  id: string;
  company_id?: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  form_schema?: Record<string, any>;
  template_content?: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalDraft {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  content: Record<string, any>;
  status: string;
  submitted_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  category?: ApprovalCategory;
  route?: ApprovalRoute;
  actions?: ApprovalAction[];
  attachments?: any[];
}

export interface ApprovalRoute {
  id: string;
  draft_id: string;
  stages: ApprovalStage[];
}

export interface ApprovalStage {
  id: string;
  route_id: string;
  type: string;
  mode?: string;
  rule?: string;
  order_index: number;
  name?: string;
  status: string;
  approvers: ApprovalApprover[];
}

export interface ApprovalApprover {
  id: string;
  stage_id: string;
  user_id: string;
  order_index: number;
  status: string;
  acted_at?: string;
  comments?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    title?: string;
    employee_profile?: {
      department: string;
      emp_no: string;
    };
  };
}

export interface ApprovalAction {
  id: string;
  draft_id: string;
  user_id: string;
  action: string;
  comments?: string;
  metadata?: Record<string, any>;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    title?: string;
    employee_profile?: {
      department: string;
      emp_no: string;
    };
  };
}

export interface CreateDraftRequest {
  categoryId: string;
  title: string;
  content: Record<string, any>;
  description?: string;
  attachmentIds?: string[];
}

export interface SubmitDraftRequest {
  routeTemplateId?: string;
  customRoute?: CustomRouteStage[];
  comments?: string;
}

export interface CustomRouteStage {
  type: string;
  mode?: string;
  rule?: string;
  name?: string;
  approvers: CustomRouteApprover[];
}

export interface CustomRouteApprover {
  userId: string;
  isRequired?: boolean;
}

export interface ApprovalActionRequest {
  comments?: string;
}

export interface ApprovalListResponse {
  data: ApprovalDraft[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApprovalStats {
  myDrafts: {
    draft: number;
    submitted: number;
    inProgress: number;
    approved: number;
    rejected: number;
  };
  pendingApprovals: number;
  completedApprovals: number;
}

export const approvalApi = {
  // Categories
  getCategories: (): Promise<ApprovalCategory[]> =>
    apiClient.get('/approval/categories').then(res => res.data),

  // Drafts
  getMyDrafts: (params: { status?: string; page?: number; limit?: number }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/drafts', { params }).then(res => res.data),

  getPendingApprovals: (params: { page?: number; limit?: number }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/pending', { params }).then(res => res.data),

  getDraft: (id: string): Promise<ApprovalDraft> =>
    apiClient.get(`/approval/drafts/${id}`).then(res => res.data),

  createDraft: (data: CreateDraftRequest): Promise<ApprovalDraft> =>
    apiClient.post('/approval/drafts', data).then(res => res.data),

  updateDraft: (id: string, data: Partial<CreateDraftRequest>): Promise<ApprovalDraft> =>
    apiClient.put(`/approval/drafts/${id}`, data).then(res => res.data),

  submitDraft: (id: string, data: SubmitDraftRequest): Promise<{ success: boolean }> =>
    apiClient.post(`/approval/drafts/${id}/submit`, data).then(res => res.data),

  deleteDraft: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/approval/drafts/${id}`).then(res => res.data),

  recallDraft: (id: string, data: ApprovalActionRequest): Promise<{ success: boolean; message: string }> =>
    apiClient.post(`/approval/drafts/${id}/recall`, data).then(res => res.data),

  // Actions
  approveDraft: (id: string, data: ApprovalActionRequest): Promise<{ success: boolean }> =>
    apiClient.post(`/approval/drafts/${id}/approve`, data).then(res => res.data),

  rejectDraft: (id: string, data: ApprovalActionRequest): Promise<{ success: boolean }> =>
    apiClient.post(`/approval/drafts/${id}/reject`, data).then(res => res.data),

  addComment: (id: string, data: ApprovalActionRequest): Promise<{ success: boolean }> =>
    apiClient.post(`/approval/drafts/${id}/comment`, data).then(res => res.data),

  // Stats
  getStats: (): Promise<ApprovalStats> =>
    apiClient.get('/approval/stats').then(res => res.data),

  // Pending approvals count
  getPendingCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/pending/count').then(res => res.data),

  // Inbox (수신함)
  getInboxDocuments: (params: { page?: number; limit?: number; type?: string; search?: string; status?: string }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/inbox', { params }).then(res => res.data),

  getInboxCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/inbox/count').then(res => res.data),

  // Outbox (상신함)
  getOutboxDocuments: (params: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/outbox', { params }).then(res => res.data),

  getOutboxCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/outbox/count').then(res => res.data),

  // Reference (참조문서)
  getReferenceDocuments: (params: { page?: number; limit?: number }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/reference', { params }).then(res => res.data),

  getReferenceCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/reference/count').then(res => res.data),
};

// User API
export interface User {
  id: string;
  name: string;
  email: string;
  title?: string;
  role: string;
  employee_profile?: {
    department: string;
    emp_no: string;
  };
}

export const userApi = {
  getUsers: (): Promise<User[]> =>
    apiClient.get('/users').then(res => res.data.data || []),
};

// Attitude API
export interface AttitudeSession {
  id: string;
  date: string;
  login_time: string;
  logout_time?: string;
  total_active_time?: number;
  total_idle_time?: number;
  productivity_score?: number;
  status: string;
  screenshots?: any[];
  idle_periods?: any[];
  app_usage?: any[];
  web_usage?: any[];
}

export interface StartSessionRequest {
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ScreenshotUploadRequest {
  screenshot: File;
  metadata?: {
    active_window?: string;
    screen_resolution?: string;
  };
}

export interface AppUsageRequest {
  app_name: string;
  process_name: string;
  app_category?: string;
  start_time: string;
  end_time: string;
  duration: number;
  is_productive: boolean;
}

export interface WebUsageRequest {
  domain: string;
  url: string;
  title?: string;
  category?: string;
  start_time: string;
  end_time: string;
  duration: number;
  is_productive: boolean;
}

export interface IdleReportRequest {
  start_time: string;
  end_time: string;
  duration: number;
  reason?: string;
}

export const attitudeApi = {
  // Session management
  startSession: (data: StartSessionRequest): Promise<AttitudeSession> =>
    apiClient.post('/attitude/session/start', data).then(res => res.data),
    
  endSession: (): Promise<{ success: boolean }> =>
    apiClient.post('/attitude/session/end').then(res => res.data),
    
  getCurrentSession: (): Promise<AttitudeSession | null> =>
    apiClient.get('/attitude/session/current').then(res => res.data),

  // Agent download info
  getAgentDownloadInfo: (): Promise<{
    currentVersion: string;
    downloads: {
      windows: { url: string; filename: string; size: string };
      macos: { url: string; filename: string; size: string };
      linux: { url: string; filename: string; size: string };
    };
    releaseNotes: string;
    minimumOSVersions: {
      windows: string;
      macos: string; 
      linux: string;
    };
  }> =>
    apiClient.get('/attitude/agent/download-info').then(res => res.data),
    
  // Screenshot upload
  uploadScreenshot: (data: ScreenshotUploadRequest): Promise<{ success: boolean; screenshot_id: string }> => {
    const formData = new FormData();
    formData.append('screenshot', data.screenshot);
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }
    return apiClient.post('/attitude/screenshots', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
    
  // Usage reporting
  reportAppUsage: (data: AppUsageRequest): Promise<{ success: boolean }> =>
    apiClient.post('/attitude/app-usage', data).then(res => res.data),
    
  reportWebUsage: (data: WebUsageRequest): Promise<{ success: boolean }> =>
    apiClient.post('/attitude/web-usage', data).then(res => res.data),
    
  reportIdle: (data: IdleReportRequest): Promise<{ success: boolean }> =>
    apiClient.post('/attitude/idle', data).then(res => res.data),
    
  // Statistics
  getSessionHistory: (params: { page?: number; limit?: number; startDate?: string; endDate?: string }): Promise<any> =>
    apiClient.get('/attitude/sessions', { params }).then(res => res.data),
    
  getProductivityStats: (params: { period?: string }): Promise<any> =>
    apiClient.get('/attitude/stats/productivity', { params }).then(res => res.data),
};

