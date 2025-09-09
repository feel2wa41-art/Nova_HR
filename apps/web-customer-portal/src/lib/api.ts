import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', import.meta.env.MODE);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for network latency
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request logging
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('reko_hr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

// Combined response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      const refreshToken = localStorage.getItem('reko_hr_refresh_token');
      
      if (refreshToken) {
        try {
          const response = await authApi.refresh({ refreshToken });
          localStorage.setItem('reko_hr_token', response.accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect
          localStorage.removeItem('reko_hr_token');
          localStorage.removeItem('reko_hr_refresh_token');
          
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // No refresh token, clear tokens and redirect
        localStorage.removeItem('reko_hr_token');
        localStorage.removeItem('reko_hr_refresh_token');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 403) {
      const token = localStorage.getItem('reko_hr_token');
      if (!token) {
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

  registerRemoteWork: (data: any): Promise<any> =>
    apiClient.post('/attendance/remote-work', data).then(res => res.data),

  registerOffsiteWork: (data: any): Promise<any> =>
    apiClient.post('/attendance/offsite-work', data).then(res => res.data),

  registerEarlyCheckout: (data: any): Promise<any> =>
    apiClient.post('/attendance/early-checkout', data).then(res => res.data),
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
  user?: User;
  creator?: User;
  description?: string;
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
  category_id: string;
  title: string;
  form_data: Record<string, any>;
  comments?: string;
  attachments?: string[];
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
    apiClient.get('/approval/categories').then(res => res.data).catch(() => {
      // Mock data for testing when API server is not available
      return [
        {
          id: 'overtime-category-mock',
          code: 'OVERTIME_REQUEST',
          name: '추가근무 신청',
          description: '야근, 주말근무, 특근(공휴일), 조기출근 등 추가근무 신청을 위한 전자결재 양식',
          form_schema: {
            type: 'object',
            properties: {
              overtime_type: {
                type: 'string',
                title: '추가근무 유형',
                enum: ['EVENING', 'WEEKEND', 'HOLIDAY', 'EARLY'],
                enumNames: ['야근', '주말근무', '특근(공휴일)', '조기출근']
              }
            }
          },
          is_active: true,
          order_index: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'expense-category-mock',
          code: 'EXPENSE_REQUEST',
          name: '지출결의서',
          description: '업무 관련 지출에 대한 승인 요청',
          form_schema: {
            type: 'object',
            properties: {
              amount: { type: 'number', title: '금액' },
              description: { type: 'string', title: '내용' }
            }
          },
          is_active: true,
          order_index: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as ApprovalCategory[];
    }),

  // Drafts
  getMyDrafts: (params: { status?: string; page?: number; limit?: number }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/drafts', { params }).then(res => res.data),

  getPendingApprovals: (params: { page?: number; limit?: number }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/pending', { params }).then(res => res.data),

  getDraft: (id: string): Promise<ApprovalDraft> =>
    apiClient.get(`/approval/drafts/${id}`).then(res => res.data),

  createDraft: (data: CreateDraftRequest): Promise<ApprovalDraft> =>
    apiClient.post('/approval/drafts', data).then(res => res.data).catch(() => {
      // Mock response for testing
      return {
        id: 'draft-' + Date.now(),
        user_id: 'user-mock',
        category_id: data.category_id,
        title: data.title,
        content: data.form_data,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: data.attachments || []
      } as ApprovalDraft;
    }),

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

  // Inbox
  getInboxDocuments: (params: { page?: number; limit?: number; type?: string; search?: string; status?: string }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/inbox', { params }).then(res => res.data),

  getInboxCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/inbox/count').then(res => res.data),

  // Outbox
  getOutboxDocuments: (params: { page?: number; limit?: number; search?: string; status?: string; sortBy?: string }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/outbox', { params }).then(res => res.data),

  getOutboxCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/outbox/count').then(res => res.data),

  // Reference Documents
  getReferenceDocuments: (params: { page?: number; limit?: number }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/reference', { params }).then(res => res.data),

  getReferenceCount: (): Promise<{ count: number }> =>
    apiClient.get('/approval/reference/count').then(res => res.data),

  // Route Templates
  getUserApprovalRoutes: (): Promise<any[]> =>
    apiClient.get('/approval/routes/user').then(res => res.data || []),

  saveUserApprovalRoute: (data: any): Promise<any> =>
    apiClient.post('/approval/routes/user', data).then(res => res.data),

  getCompletedDocuments: (params?: { 
    page?: number; 
    limit?: number;
    search?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApprovalListResponse> =>
    apiClient.get('/approval/completed', { params }).then(res => res.data),

  // Admin Route Templates
  getAdminApprovalTemplates: (): Promise<any[]> =>
    apiClient.get('/approval/admin/templates').then(res => res.data || []),

  createRouteTemplate: (data: any): Promise<any> =>
    apiClient.post('/approval/admin/templates', data).then(res => res.data),

  updateRouteTemplate: (id: string, data: any): Promise<any> =>
    apiClient.put(`/approval/admin/templates/${id}`, data).then(res => res.data),

  deleteRouteTemplate: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/approval/admin/templates/${id}`).then(res => res.data),
};

// User API
export interface User {
  id: string;
  name: string;
  email: string;
  title?: string;
  role: string;
  avatar_url?: string;
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

// HR Community API
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  post_type: 'GENERAL' | 'ANNOUNCEMENT' | 'POLICY' | 'URGENT' | 'CELEBRATION' | 'QUESTION';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  is_pinned: boolean;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  is_liked: boolean;
}

export const api = {
  // Basic HTTP methods
  get: (url: string, config?: any) => apiClient.get(url, config),
  post: (url: string, data?: any, config?: any) => apiClient.post(url, data, config),
  put: (url: string, data?: any, config?: any) => apiClient.put(url, data, config),
  delete: (url: string, config?: any) => apiClient.delete(url, config),
  patch: (url: string, data?: any, config?: any) => apiClient.patch(url, data, config),
  
  ...authApi,
  ...attendanceApi,
  ...companyApi,
  ...approvalApi,
  ...userApi,
  
  // HR Community methods
  hrCommunity: {
    getPosts: (params?: any) =>
      apiClient.get('/hr-community/posts', { params }).then(res => res.data),
    
    createPost: (data: any) =>
      apiClient.post('/hr-community/posts', data).then(res => res.data),
    
    getPost: (id: string) =>
      apiClient.get(`/hr-community/posts/${id}`).then(res => res.data),
    
    likePost: (id: string) =>
      apiClient.post(`/hr-community/posts/${id}/like`).then(res => res.data),
    
    recordView: (id: string) =>
      apiClient.post(`/hr-community/posts/${id}/view`).then(res => res.data),
    
    getNotifications: (params?: any) =>
      apiClient.get('/hr-community/notifications', { params }).then(res => res.data),
    
    getUnreadCount: () =>
      apiClient.get('/hr-community/notifications/unread-count').then(res => res.data),
    
    getVapidKey: () =>
      apiClient.get('/hr-community/vapid-public-key').then(res => res.data),
  }
};

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

  getAgentStatus: (): Promise<any> =>
    apiClient.get('/attitude/agent/status').then(res => res.data),
    
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

// ================================
// OVERTIME API
// ================================

export interface OvertimeRequest {
  id: string;
  overtime_type: 'EVENING' | 'WEEKEND' | 'HOLIDAY' | 'EARLY';
  work_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  work_description: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface CreateOvertimeRequest {
  overtime_type: 'EVENING' | 'WEEKEND' | 'HOLIDAY' | 'EARLY';
  work_date: string;
  start_time: string;
  end_time: string;
  work_description: string;
  reason: string;
  emergency_level?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expected_completion?: string;
}

export const overtimeApi = {
  // Get overtime requests
  getOvertimeRequests: (params?: {
    page?: number;
    limit?: number;
    overtime_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    data: OvertimeRequest[];
    total: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get('/overtime/my-requests', { params }).then(res => res.data),

  // Get single overtime request
  getOvertimeRequest: (id: string): Promise<OvertimeRequest> =>
    apiClient.get(`/overtime/requests/${id}`).then(res => res.data),

  // Create overtime request
  createOvertimeRequest: (data: CreateOvertimeRequest): Promise<OvertimeRequest> =>
    apiClient.post('/overtime/requests', data).then(res => res.data),

  // Update overtime request
  updateOvertimeRequest: (id: string, data: Partial<CreateOvertimeRequest>): Promise<OvertimeRequest> =>
    apiClient.put(`/overtime/requests/${id}`, data).then(res => res.data),

  // Delete overtime request
  deleteOvertimeRequest: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/overtime/requests/${id}`).then(res => res.data),

  // Upload attachment
  uploadAttachment: (requestId: string, file: File): Promise<{
    success: boolean;
    attachment_id: string;
    file_url: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/overtime/requests/${requestId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },

  // Delete attachment
  deleteAttachment: (attachmentId: string): Promise<{ success: boolean }> =>
    apiClient.delete(`/overtime/attachments/${attachmentId}`).then(res => res.data),

  // Get overtime statistics
  getOvertimeStatistics: (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    totalHours: number;
    averageHours: number;
    byType: Record<string, number>;
    byMonth: Record<string, number>;
  }> =>
    apiClient.get('/overtime/company/company-demo/statistics', { params }).then(res => res.data),
};

