export interface ApprovalDraft {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  content: any;
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface ApprovalRoute {
  id: string;
  draft_id: string;
  approver_id: string;
  step_type: 'AGREEMENT' | 'APPROVAL' | 'REFERENCE';
  step_order: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment?: string;
  processed_at?: string;
}

export interface ApprovalCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  form_schema?: any;
  is_active: boolean;
}