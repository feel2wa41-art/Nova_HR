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
}

interface LeaveBalance {
  leaveType: string;
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
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    emergency?: boolean;
  }) => Promise<void>;
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
  },
];

const mockLeaveBalances: LeaveBalance[] = [
  {
    leaveType: 'ANNUAL',
    allocated: 15,
    used: 2.5,
    pending: 1,
    remaining: 11.5,
  },
  {
    leaveType: 'SICK',
    allocated: 30,
    used: 0,
    pending: 0,
    remaining: 30,
  },
  {
    leaveType: 'PERSONAL',
    allocated: 5,
    used: 1,
    pending: 0,
    remaining: 4,
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
    const response = await apiClient.get('/leave-approval/types');
    const data = response.data;
    
    // Transform API response to match interface
    return data.map((type: any) => ({
      id: type.id,
      name: type.name,
      code: type.code,
      maxDaysYear: type.max_days_year,
      requiresApproval: type.requires_approval,
      deductWeekends: true, // Assume default
      colorHex: type.color_hex,
      isPaid: type.is_paid,
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
    
    // Transform API response to match interface
    return Object.entries(data).map(([leaveType, balance]: [string, any]) => ({
      leaveType: leaveType.toUpperCase(),
      allocated: balance.allocated,
      used: balance.used,
      pending: balance.pending,
      remaining: balance.remaining,
    }));
  } catch (error) {
    console.error('Failed to fetch leave balances:', error);
    throw new Error('Failed to fetch leave balances');
  }
};

const fetchLeaveRequestsApi = async (): Promise<LeaveRequest[]> => {
  try {
    const response = await apiClient.get('/leave-approval/requests');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch leave requests:', error);
    throw new Error('Failed to fetch leave requests');
  }
};

const submitLeaveRequestApi = async (request: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  emergency?: boolean;
}): Promise<LeaveRequest> => {
  try {
    const response = await apiClient.post('/leave-approval/submit', request);
    const result = response.data;
    
    // Return a LeaveRequest-like object (the actual leave request will be fetched later)
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      id: result.approvalId,
      leaveTypeId: request.leaveTypeId,
      leaveTypeName: result.data.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      daysCount: result.data.workingDays || diffDays,
      reason: request.reason,
      emergency: result.data.emergency || false,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Failed to submit leave request:', error);
    throw new Error(error.response?.data?.message || 'Failed to submit leave request');
  }
};

const cancelLeaveRequestApi = async (requestId: string): Promise<void> => {
  try {
    // Note: This endpoint would need to be implemented in the backend
    await apiClient.post(`/leave-approval/cancel/${requestId}`);
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
          // Fall back to mock data on error
          const leaveTypes = mockLeaveTypes;
          set({ leaveTypes, isLoading: false });
        }
      },

      fetchLeaveBalances: async () => {
        set({ isLoading: true });
        try {
          const leaveBalances = await fetchLeaveBalancesApi();
          set({ leaveBalances, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch leave balances:', error);
          // Fall back to mock data on error
          const leaveBalances = mockLeaveBalances;
          set({ leaveBalances, isLoading: false });
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
          const newRequest = await submitLeaveRequestApi(request);
          const { leaveRequests } = get();
          set({
            leaveRequests: [newRequest, ...leaveRequests],
            isSubmitting: false,
          });
          
          // Refresh the data from server after submission
          setTimeout(() => {
            get().fetchLeaveRequests();
            get().fetchLeaveBalances();
          }, 1000);
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