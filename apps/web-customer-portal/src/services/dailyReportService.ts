import { apiClient } from '../lib/api';

export interface ProgramCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  program_mappings: ProgramMapping[];
}

export interface ProgramMapping {
  id: string;
  category_id: string;
  program_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ProgramCategory;
}

export interface DailyReportEntry {
  id: string;
  report_id: string;
  category_id: string;
  task_description: string;
  output?: string;
  notes?: string;
  duration_minutes: number;
  programs_used: string[];
  created_at: string;
  updated_at: string;
  category: ProgramCategory;
}

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  summary?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  entries: DailyReportEntry[];
  user: {
    name: string;
    email: string;
    title?: string;
  };
  reviewer?: {
    name: string;
    email: string;
  };
}

export interface CreateDailyReportEntry {
  category_id: string;
  task_description: string;
  output?: string;
  notes?: string;
  duration_minutes?: number;
  programs_used?: string[];
}

export interface CreateDailyReport {
  report_date: string;
  summary?: string;
  entries?: CreateDailyReportEntry[];
}

export interface UpdateDailyReport {
  summary?: string;
  status?: 'DRAFT' | 'SUBMITTED';
}

export interface ReviewReport {
  status: 'APPROVED' | 'REJECTED';
}

export interface ReportsListResponse {
  reports: DailyReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class DailyReportService {
  // Daily Report CRUD
  async createReport(data: CreateDailyReport): Promise<DailyReport> {
    const response = await apiClient.post('/daily-reports', data);
    return response.data;
  }

  async getMyReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ReportsListResponse> {
    const response = await apiClient.get('/daily-reports/my-reports', { params });
    return response.data;
  }

  async getReportById(id: string): Promise<DailyReport> {
    const response = await apiClient.get(`/daily-reports/${id}`);
    return response.data;
  }

  async updateReport(id: string, data: UpdateDailyReport): Promise<DailyReport> {
    const response = await apiClient.put(`/daily-reports/${id}`, data);
    return response.data;
  }

  async submitReport(id: string): Promise<DailyReport> {
    const response = await apiClient.post(`/daily-reports/${id}/submit`);
    return response.data;
  }

  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`/daily-reports/${id}`);
  }

  // Report Entry CRUD
  async addEntry(reportId: string, data: CreateDailyReportEntry): Promise<DailyReportEntry> {
    const response = await apiClient.post(`/daily-reports/${reportId}/entries`, data);
    return response.data;
  }

  async updateEntry(
    reportId: string, 
    entryId: string, 
    data: Partial<CreateDailyReportEntry>
  ): Promise<DailyReportEntry> {
    const response = await apiClient.put(`/daily-reports/${reportId}/entries/${entryId}`, data);
    return response.data;
  }

  async deleteEntry(reportId: string, entryId: string): Promise<void> {
    await apiClient.delete(`/daily-reports/${reportId}/entries/${entryId}`);
  }

  // Team/Manager functions
  async getTeamReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportsListResponse> {
    const response = await apiClient.get('/daily-reports/team/reports', { params });
    return response.data;
  }

  async reviewReport(id: string, data: ReviewReport): Promise<DailyReport> {
    const response = await apiClient.post(`/daily-reports/${id}/review`, data);
    return response.data;
  }

  // Program Category functions
  async getCategories(includeInactive?: boolean): Promise<ProgramCategory[]> {
    const response = await apiClient.get('/daily-reports/categories/all', {
      params: { includeInactive }
    });
    return response.data;
  }

  async createCategory(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    is_active?: boolean;
  }): Promise<ProgramCategory> {
    const response = await apiClient.post('/daily-reports/categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    is_active?: boolean;
  }): Promise<ProgramCategory> {
    const response = await apiClient.put(`/daily-reports/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/daily-reports/categories/${id}`);
  }

  async addProgramMapping(categoryId: string, programName: string): Promise<ProgramMapping> {
    const response = await apiClient.post(`/daily-reports/categories/${categoryId}/programs`, {
      program_name: programName
    });
    return response.data;
  }

  async removeProgramMapping(categoryId: string, mappingId: string): Promise<void> {
    await apiClient.delete(`/daily-reports/categories/${categoryId}/programs/${mappingId}`);
  }

  async getAllProgramMappings(): Promise<ProgramMapping[]> {
    const response = await apiClient.get('/daily-reports/categories/mappings/all');
    return response.data;
  }

  async createDefaultCategories(): Promise<ProgramCategory[]> {
    const response = await apiClient.post('/daily-reports/categories/setup-defaults');
    return response.data;
  }
}

export const dailyReportService = new DailyReportService();