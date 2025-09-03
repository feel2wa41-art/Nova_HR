export interface LeaveRequest {
  id: string;
  user_id: string;
  type: 'ANNUAL' | 'SICK' | 'SPECIAL' | 'OTHER';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approver_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  user_id: string;
  year: number;
  total_annual: number;
  used_annual: number;
  remaining_annual: number;
  total_sick: number;
  used_sick: number;
  remaining_sick: number;
}