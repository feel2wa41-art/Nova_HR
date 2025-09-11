import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysYear: number | null;
  requiresApproval: boolean;
  deductWeekends: boolean;
  colorHex: string;
  isPaid: boolean;
  allowHalfDays?: boolean;
}

interface LeaveBalance {
  leaveType: string;
  leaveTypeName?: string;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

interface LeaveRequest {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string;
  emergency: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  decidedBy?: string;
  decidedAt?: string;
  comments?: string;
  createdAt: string;
}

interface LeaveState {
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Actions
  fetchLeaveTypes: () => Promise<void>;
  fetchLeaveBalances: () => Promise<void>;
  fetchLeaveRequests: () => Promise<void>;
  submitLeaveRequest: (request: {
    categoryId?: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    halfDayType?: string;
    reason?: string;
    emergency?: boolean;
    approvalSettings?: any;
  }) => Promise<any>;
  cancelLeaveRequest: (requestId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

// Mock data
const mockLeaveTypes: LeaveType[] = [
  {
    id: 'annual',
    name: '연차',
    code: 'ANNUAL',
    maxDaysYear: 15,
    requiresApproval: true,
    deductWeekends: false,
    colorHex: '#3b82f6',
    isPaid: true,
    allowHalfDays: true,
  },
  {
    id: 'sick',
    name: '병가',
    code: 'SICK',
    maxDaysYear: 30,
    requiresApproval: false,
    deductWeekends: false,
    colorHex: '#ef4444',
    isPaid: true,
    allowHalfDays: true,
  },
  {
    id: 'personal',
    name: '개인사유',
    code: 'PERSONAL',
    maxDaysYear: 5,
    requiresApproval: true,
    deductWeekends: false,
    colorHex: '#8b5cf6',
    isPaid: false,
    allowHalfDays: true,
  },
  {
    id: 'maternity',
    name: '출산휴가',
    code: 'MATERNITY',
    maxDaysYear: 90,
    requiresApproval: true,
    deductWeekends: true,
    colorHex: '#f59e0b',
    isPaid: true,
    allowHalfDays: true,
  },
  {
    id: 'special',
    name: '특별휴가',
    code: 'SPECIAL',
    maxDaysYear: 10,
    requiresApproval: true,
    deductWeekends: false,
    colorHex: '#06b6d4',
    isPaid: true,
    allowHalfDays: true,
  },
  {
    id: 'special_2',
    name: '특별휴가2',
    code: 'SPECIAL_2',
    maxDaysYear: 5,
    requiresApproval: true,
    deductWeekends: false,
    colorHex: '#22c55e',
    isPaid: true,
    allowHalfDays: true,
  },
];

const mockLeaveBalances: LeaveBalance[] = [
  {
    leaveType: 'ANNUAL',
    leaveTypeName: '연차',
    allocated: 15,
    used: 2.5,
    pending: 1,
    remaining: 11.5,
  },
  {
    leaveType: 'SICK',
    leaveTypeName: '병가',
    allocated: 30,
    used: 0,
    pending: 0,
    remaining: 30,
  },
  {
    leaveType: 'PERSONAL',
    leaveTypeName: '개인사유',
    allocated: 5,
    used: 1,
    pending: 0,
    remaining: 4,
  },
  {
    leaveType: 'SPECIAL',
    leaveTypeName: '특별휴가',
    allocated: 10,
    used: 0,
    pending: 0,
    remaining: 10,
  },
  {
    leaveType: 'SPECIAL_2',
    leaveTypeName: '특별휴가2',
    allocated: 5,
    used: 0,
    pending: 0,
    remaining: 5,
  },
];

const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'req-1',
    leaveTypeId: 'annual',
    leaveTypeName: '연차',
    startDate: '2025-08-25',
    endDate: '2025-08-25',
    daysCount: 1,
    reason: '개인 용무',
    emergency: false,
    status: 'PENDING',
    createdAt: '2025-08-19T09:30:00.000Z',
  },
  {
    id: 'req-2',
    leaveTypeId: 'annual',
    leaveTypeName: '연차',
    startDate: '2025-08-15',
    endDate: '2025-08-16',
    daysCount: 1.5,
    reason: '가족 행사',
    emergency: false,
    status: 'APPROVED',
    decidedBy: '김관리자',
    decidedAt: '2025-08-14T15:20:00.000Z',
    createdAt: '2025-08-13T10:15:00.000Z',
  },
];

// API base URL
// API functions
const fetchLeaveTypesApi = async (): Promise<LeaveType[]> => {
  try {
    const response = await apiClient.get('/leave-types');
    const data = response.data;
    
    // API now returns data in the correct format
    return data.map((type: any) => ({
      ...type,
      deductWeekends: type.deductWeekends ?? true, // Use value from API or default to true
      allowHalfDays: true, // 모든 휴가 타입에서 반차 허용
    }));
  } catch (error) {
    console.error('Failed to fetch leave types:', error);
    throw new Error('Failed to fetch leave types');
  }
};

const fetchLeaveBalancesApi = async (): Promise<LeaveBalance[]> => {
  try {
    const response = await apiClient.get('/leave-approval/balance');
    const data = response.data;
    
    // API now returns data in the correct array format
    return data.map((balance: any) => ({
      leaveType: balance.leaveType || balance.leave_type_id || balance.code,
      leaveTypeName: balance.leaveTypeName || balance.leave_type_name || balance.name,
      allocated: balance.allocated || 0,
      used: balance.used || 0,
      pending: balance.pending || 0,
      remaining: balance.remaining || balance.available || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch leave balances:', error);
    throw new Error('Failed to fetch leave balances');
  }
};

const fetchLeaveRequestsApi = async (): Promise<LeaveRequest[]> => {
  try {
    const response = await apiClient.get('/leave/requests');
    const data = response.data.data || response.data; // Handle both paginated and non-paginated responses
    return data.map((req: any) => ({
      id: req.id,
      leaveTypeId: req.leave_type_id || req.leaveTypeId,
      leaveTypeName: req.leave_type?.name || req.leave_type_name || req.leaveTypeName,
      startDate: req.start_date || req.startDate,
      endDate: req.end_date || req.endDate,
      daysCount: req.days_count || req.daysCount,
      reason: req.reason,
      emergency: req.emergency || false,
      status: req.status,
      decidedBy: req.decided_by || req.decidedBy,
      decidedAt: req.decided_at || req.decidedAt,
      comments: req.comments,
      createdAt: req.created_at || req.createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch leave requests:', error);
    throw new Error('Failed to fetch leave requests');
  }
};

const submitLeaveRequestApi = async (request: {
  categoryId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDayType?: string;
  reason?: string;
  emergency?: boolean;
  approvalSettings?: any;
}): Promise<any> => {
  try {
    const response = await apiClient.post('/leave/requests', {
      leave_type: request.leaveTypeId,
      start_date: request.startDate,
      end_date: request.endDate,
      half_day_period: request.halfDayType === 'MORNING' ? 'morning' : 
                       request.halfDayType === 'AFTERNOON' ? 'afternoon' : undefined,
      reason: request.reason || '휴가 신청',
    });
    const result = response.data;
    
    console.log('API response received:', result);
    
    // Return a LeaveRequest-like object (the actual leave request will be fetched later)
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      id: result.approvalId || result.id,
      leaveTypeId: request.leaveTypeId,
      leaveTypeName: result.data?.leaveType || result.leave_type || 'Unknown',
      startDate: request.startDate,
      endDate: request.endDate,
      daysCount: result.data?.workingDays || result.days_count || diffDays,
      reason: request.reason,
      emergency: result.data?.emergency || result.emergency || false,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Failed to submit leave request:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Request data sent:', {
      leave_type: request.leaveTypeId,
      start_date: request.startDate,
      end_date: request.endDate,
      half_day_period: request.halfDayType === 'MORNING' ? 'morning' : 
                       request.halfDayType === 'AFTERNOON' ? 'afternoon' : undefined,
      reason: request.reason,
    });
    throw new Error(error.response?.data?.message || 'Failed to submit leave request');
  }
};

const cancelLeaveRequestApi = async (requestId: string): Promise<void> => {
  try {
    await apiClient.put(`/leave/requests/${requestId}/cancel`);
  } catch (error) {
    console.error('Failed to cancel leave request:', error);
    throw new Error('Failed to cancel leave request');
  }
};

export const useLeave = create<LeaveState>()(
  persist(
    (set, get) => ({
      leaveTypes: [],
      leaveBalances: [],
      leaveRequests: [],
      isLoading: false,
      isSubmitting: false,

      fetchLeaveTypes: async () => {
        set({ isLoading: true });
        try {
          const leaveTypes = await fetchLeaveTypesApi();
          set({ leaveTypes, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch leave types:', error);
          set({ leaveTypes: [], isLoading: false });
        }
      },

      fetchLeaveBalances: async () => {
        set({ isLoading: true });
        try {
          const leaveBalances = await fetchLeaveBalancesApi();
          set({ leaveBalances, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch leave balances:', error);
          // DB 연결 실패시 빈 배열로 설정
          set({ leaveBalances: [], isLoading: false });
        }
      },

      fetchLeaveRequests: async () => {
        set({ isLoading: true });
        try {
          const leaveRequests = await fetchLeaveRequestsApi();
          set({ leaveRequests, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch leave requests:', error);
          // Fall back to localStorage/mock data on error
          const saved = localStorage.getItem('nova_hr_leave_requests');
          const leaveRequests = saved ? JSON.parse(saved) : mockLeaveRequests;
          set({ leaveRequests, isLoading: false });
        }
      },

      submitLeaveRequest: async (request) => {
        set({ isSubmitting: true });
        try {
          // Find the leave type to get its code
          const { leaveTypes } = get();
          console.log('Available leave types:', leaveTypes);
          console.log('Requested leave type ID:', request.leaveTypeId);
          const selectedLeaveType = leaveTypes.find(type => type.id === request.leaveTypeId);
          console.log('Selected leave type:', selectedLeaveType);
          if (!selectedLeaveType) {
            throw new Error('Selected leave type not found');
          }
          
          // Pass the leave type code instead of ID
          const result = await submitLeaveRequestApi({
            ...request,
            leaveTypeId: selectedLeaveType.code // Send code instead of ID
          });
          const { leaveRequests } = get();
          
          // Add to local state if we have request data
          if (result.id) {
            set({
              leaveRequests: [result, ...leaveRequests],
              isSubmitting: false,
            });
          } else {
            set({ isSubmitting: false });
          }
          
          // Immediately refresh the data from server after submission
          await Promise.all([
            get().fetchLeaveRequests(),
            get().fetchLeaveBalances()
          ]);
          
          // Return the full result for the component to handle
          return result;
        } catch (error) {
          set({ isSubmitting: false });
          throw error;
        }
      },

      cancelLeaveRequest: async (requestId) => {
        set({ isLoading: true });
        try {
          await cancelLeaveRequestApi(requestId);
          const { leaveRequests } = get();
          const updated = leaveRequests.map(req => 
            req.id === requestId 
              ? { ...req, status: 'CANCELLED' as const }
              : req
          );
          set({ leaveRequests: updated, isLoading: false });
        } catch (error) {
          console.error('Failed to cancel leave request:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'nova-hr-leave',
      partialize: (state) => ({
        leaveTypes: state.leaveTypes,
        leaveBalances: state.leaveBalances,
        leaveRequests: state.leaveRequests,
      }),
    }
  )
);