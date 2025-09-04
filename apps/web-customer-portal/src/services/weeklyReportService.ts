import { apiClient } from '../lib/api';
import { ProgramCategory } from './dailyReportService';

export interface WeeklyReportEntry {
  id: string;
  report_id: string;
  category_id: string;
  summary: string;
  total_hours: number; // in minutes
  key_tasks: string[];
  deliverables: string[];
  programs_used: string[];
  created_at: string;
  updated_at: string;
  category: ProgramCategory;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  summary?: string;
  achievements?: string;
  challenges?: string;
  next_week_goals?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  is_auto_generated: boolean;
  daily_reports_included: string[];
  created_at: string;
  updated_at: string;
  entries: WeeklyReportEntry[];
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

export interface CreateWeeklyReportEntry {
  category_id: string;
  summary: string;
  total_hours?: number;
  key_tasks?: string[];
  deliverables?: string[];
  programs_used?: string[];
}

export interface CreateWeeklyReport {
  week_start: string;
  summary?: string;
  achievements?: string;
  challenges?: string;
  next_week_goals?: string;
  is_auto_generated?: boolean;
  daily_reports_included?: string[];
  entries?: CreateWeeklyReportEntry[];
}

export interface UpdateWeeklyReport {
  summary?: string;
  achievements?: string;
  challenges?: string;
  next_week_goals?: string;
  status?: 'DRAFT' | 'SUBMITTED';
}

export interface GenerateWeeklyReport {
  week_start: string;
}

export interface ReviewWeeklyReport {
  status: 'APPROVED' | 'REJECTED';
}

export interface WeeklyReportsListResponse {
  reports: WeeklyReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DailyReportsAvailability {
  available: boolean;
  count: number;
  reports: {
    id: string;
    date: string;
    status: string;
  }[];
}

class WeeklyReportService {
  // Weekly Report CRUD
  async createReport(data: CreateWeeklyReport): Promise<WeeklyReport> {
    const response = await apiClient.post('/weekly-reports', data);
    return response.data;
  }

  async generateFromDailyReports(data: GenerateWeeklyReport): Promise<WeeklyReport> {
    const response = await apiClient.post('/weekly-reports/generate', data);
    return response.data;
  }

  async checkDailyReportsAvailable(weekStart: string): Promise<DailyReportsAvailability> {
    const response = await apiClient.get('/weekly-reports/daily-reports-check', {
      params: { week_start: weekStart }
    });
    return response.data;
  }

  async getMyReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<WeeklyReportsListResponse> {
    const response = await apiClient.get('/weekly-reports/my-reports', { params });
    return response.data;
  }

  async getReportById(id: string): Promise<WeeklyReport> {
    const response = await apiClient.get(`/weekly-reports/${id}`);
    return response.data;
  }

  async updateReport(id: string, data: UpdateWeeklyReport): Promise<WeeklyReport> {
    const response = await apiClient.put(`/weekly-reports/${id}`, data);
    return response.data;
  }

  async submitReport(id: string): Promise<WeeklyReport> {
    const response = await apiClient.post(`/weekly-reports/${id}/submit`);
    return response.data;
  }

  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(`/weekly-reports/${id}`);
  }

  // Report Entry CRUD
  async addEntry(reportId: string, data: CreateWeeklyReportEntry): Promise<WeeklyReportEntry> {
    const response = await apiClient.post(`/weekly-reports/${reportId}/entries`, data);
    return response.data;
  }

  async updateEntry(
    reportId: string, 
    entryId: string, 
    data: Partial<CreateWeeklyReportEntry>
  ): Promise<WeeklyReportEntry> {
    const response = await apiClient.put(`/weekly-reports/${reportId}/entries/${entryId}`, data);
    return response.data;
  }

  async deleteEntry(reportId: string, entryId: string): Promise<void> {
    await apiClient.delete(`/weekly-reports/${reportId}/entries/${entryId}`);
  }

  // Team/Manager functions
  async getTeamReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WeeklyReportsListResponse> {
    const response = await apiClient.get('/weekly-reports/team/reports', { params });
    return response.data;
  }

  async reviewReport(id: string, data: ReviewWeeklyReport): Promise<WeeklyReport> {
    const response = await apiClient.post(`/weekly-reports/${id}/review`, data);
    return response.data;
  }

  // Utility functions
  getWeekDates(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  getCurrentWeekStart(): string {
    const { start } = this.getWeekDates(new Date());
    return start.toISOString().split('T')[0];
  }

  formatWeekLabel(weekStart: string): string {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startMonth = start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    const endMonth = end.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    
    return `${startMonth} - ${endMonth}`;
  }

  getWeekYear(weekStart: string): string {
    const date = new Date(weekStart);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const weekDates = this.getWeekDates(startOfYear);
    const firstMondayOfYear = weekDates.start.getFullYear() === year ? weekDates.start : new Date(year, 0, 8 - new Date(year, 0, 1).getDay());
    
    const weekNumber = Math.floor((new Date(weekStart).getTime() - firstMondayOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return `${year}년 ${weekNumber}주차`;
  }
}

export const weeklyReportService = new WeeklyReportService();