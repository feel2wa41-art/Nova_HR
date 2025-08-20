import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Mock API functions
const mockFetchLeaveTypes = async (): Promise<LeaveType[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockLeaveTypes;
};

const mockFetchLeaveBalances = async (): Promise<LeaveBalance[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockLeaveBalances;
};

const mockFetchLeaveRequests = async (): Promise<LeaveRequest[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const saved = localStorage.getItem('nova_hr_leave_requests');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return mockLeaveRequests;
    }
  }
  return mockLeaveRequests;
};

const mockSubmitLeaveRequest = async (request: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  emergency?: boolean;
}): Promise<LeaveRequest> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const leaveType = mockLeaveTypes.find(t => t.id === request.leaveTypeId);
  if (!leaveType) {
    throw new Error('Invalid leave type');
  }
  
  // Calculate days count (simplified)
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  const newRequest: LeaveRequest = {
    id: 'req-' + Date.now(),
    leaveTypeId: request.leaveTypeId,
    leaveTypeName: leaveType.name,
    startDate: request.startDate,
    endDate: request.endDate,
    daysCount: diffDays,
    reason: request.reason,
    emergency: request.emergency || false,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  
  // Save to localStorage
  const existing = await mockFetchLeaveRequests();
  const updated = [newRequest, ...existing];
  localStorage.setItem('nova_hr_leave_requests', JSON.stringify(updated));
  
  return newRequest;
};

const mockCancelLeaveRequest = async (requestId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const existing = await mockFetchLeaveRequests();
  const updated = existing.map(req => 
    req.id === requestId 
      ? { ...req, status: 'CANCELLED' as const }
      : req
  );
  
  localStorage.setItem('nova_hr_leave_requests', JSON.stringify(updated));
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
          const leaveTypes = await mockFetchLeaveTypes();
          set({ leaveTypes, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchLeaveBalances: async () => {
        set({ isLoading: true });
        try {
          const leaveBalances = await mockFetchLeaveBalances();
          set({ leaveBalances, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      fetchLeaveRequests: async () => {
        set({ isLoading: true });
        try {
          const leaveRequests = await mockFetchLeaveRequests();
          set({ leaveRequests, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      submitLeaveRequest: async (request) => {
        set({ isSubmitting: true });
        try {
          const newRequest = await mockSubmitLeaveRequest(request);
          const { leaveRequests } = get();
          set({
            leaveRequests: [newRequest, ...leaveRequests],
            isSubmitting: false,
          });
        } catch (error) {
          set({ isSubmitting: false });
          throw error;
        }
      },

      cancelLeaveRequest: async (requestId) => {
        set({ isLoading: true });
        try {
          await mockCancelLeaveRequest(requestId);
          const { leaveRequests } = get();
          const updated = leaveRequests.map(req => 
            req.id === requestId 
              ? { ...req, status: 'CANCELLED' as const }
              : req
          );
          set({ leaveRequests: updated, isLoading: false });
        } catch (error) {
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