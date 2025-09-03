import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsObject, 
  IsUUID, 
  IsEnum, 
  IsNumber, 
  Min, 
  IsBoolean,
  ValidateNested,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ApprovalStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

export enum ApprovalAction {
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RETURN = 'RETURN',
  CANCEL = 'CANCEL',
  FORWARD = 'FORWARD'
}

export enum RouteStepType {
  AGREEMENT = 'AGREEMENT',    // 합의
  APPROVAL = 'APPROVAL',      // 결재
  REFERENCE = 'REFERENCE'     // 참조
}

export class ApprovalRouteStepDto {
  @ApiProperty({ example: 1, description: 'Step order' })
  @IsNumber({}, { message: 'Step order must be a number' })
  @Min(1, { message: 'Step order must be at least 1' })
  step_order: number;

  @ApiProperty({ 
    example: 'APPROVAL', 
    description: 'Step type',
    enum: RouteStepType
  })
  @IsEnum(RouteStepType, { message: 'Invalid step type' })
  step_type: RouteStepType;

  @ApiProperty({ example: 'user-id-123', description: 'Approver user ID' })
  @IsUUID(4, { message: 'Approver ID must be a valid UUID' })
  approver_id: string;

  @ApiProperty({ 
    example: 'Please review the expense claim', 
    description: 'Instructions for approver',
    required: false
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether approval is required or just for reference',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class CreateApprovalCategoryDto {
  @ApiProperty({ example: 'Expense Claims', description: 'Category name' })
  @IsString({ message: 'Name is required' })
  name: string;

  @ApiProperty({ 
    example: 'Category for employee expense reimbursements', 
    description: 'Category description',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: { 
      type: 'object',
      properties: {
        amount: { type: 'number', title: 'Amount' },
        description: { type: 'string', title: 'Description' }
      }
    }, 
    description: 'JSON Schema for form fields'
  })
  @IsObject({ message: 'Form schema must be a valid object' })
  form_schema: object;

  @ApiProperty({ 
    example: true, 
    description: 'Whether category is active',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    type: [ApprovalRouteStepDto],
    description: 'Default approval route steps',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalRouteStepDto)
  default_route?: ApprovalRouteStepDto[];

  @ApiProperty({ 
    example: 1000, 
    description: 'Maximum amount for auto-approval',
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Auto approval limit must be a number' })
  @Min(0, { message: 'Auto approval limit must be non-negative' })
  auto_approval_limit?: number;
}

export class UpdateApprovalCategoryDto {
  @ApiProperty({ 
    example: 'Updated Expense Claims', 
    description: 'Category name',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiProperty({ 
    example: 'Updated category description', 
    description: 'Category description',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: { 
      type: 'object',
      properties: {
        amount: { type: 'number', title: 'Amount' },
        description: { type: 'string', title: 'Description' },
        category: { type: 'string', title: 'Expense Category' }
      }
    }, 
    description: 'Updated JSON Schema for form fields',
    required: false
  })
  @IsOptional()
  @IsObject({ message: 'Form schema must be a valid object' })
  form_schema?: object;

  @ApiProperty({ 
    example: false, 
    description: 'Whether category is active',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    type: [ApprovalRouteStepDto],
    description: 'Updated default approval route steps',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalRouteStepDto)
  default_route?: ApprovalRouteStepDto[];

  @ApiProperty({ 
    example: 1500, 
    description: 'Updated maximum amount for auto-approval',
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Auto approval limit must be a number' })
  @Min(0, { message: 'Auto approval limit must be non-negative' })
  auto_approval_limit?: number;
}

export class CreateApprovalDraftDto {
  @ApiProperty({ example: 'category-id-123', description: 'Approval category ID' })
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  category_id: string;

  @ApiProperty({ example: 'Expense Claim - March 2024', description: 'Draft title' })
  @IsString({ message: 'Title is required' })
  title: string;

  @ApiProperty({ 
    example: { 
      amount: 250.50, 
      description: 'Business dinner with client',
      receipt_date: '2024-03-15'
    }, 
    description: 'Form data based on category schema'
  })
  @IsObject({ message: 'Form data must be a valid object' })
  form_data: object;

  @ApiProperty({ 
    example: ['receipt1.pdf', 'invoice2.pdf'], 
    description: 'Attached files',
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Attachments must be an array' })
  @IsString({ each: true, message: 'Each attachment must be a string' })
  attachments?: string[];

  @ApiProperty({
    type: [ApprovalRouteStepDto],
    description: 'Custom approval route (if different from category default)',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalRouteStepDto)
  custom_route?: ApprovalRouteStepDto[];

  @ApiProperty({ 
    example: 'Please expedite this approval', 
    description: 'Additional comments',
    required: false
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ 
    example: '2024-04-01', 
    description: 'Expected completion date',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date string' })
  due_date?: string;
}

export class UpdateApprovalDraftDto {
  @ApiProperty({ 
    example: 'Updated Expense Claim - March 2024', 
    description: 'Updated draft title',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @ApiProperty({ 
    example: { 
      amount: 275.75, 
      description: 'Updated business dinner with client',
      receipt_date: '2024-03-15'
    }, 
    description: 'Updated form data',
    required: false
  })
  @IsOptional()
  @IsObject({ message: 'Form data must be a valid object' })
  form_data?: object;

  @ApiProperty({ 
    example: ['receipt1.pdf', 'invoice2.pdf', 'receipt3.pdf'], 
    description: 'Updated attached files',
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Attachments must be an array' })
  @IsString({ each: true, message: 'Each attachment must be a string' })
  attachments?: string[];

  @ApiProperty({
    type: [ApprovalRouteStepDto],
    description: 'Updated custom approval route',
    required: false
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalRouteStepDto)
  custom_route?: ApprovalRouteStepDto[];

  @ApiProperty({ 
    example: 'Updated comments for this approval', 
    description: 'Updated additional comments',
    required: false
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ 
    example: '2024-04-15', 
    description: 'Updated expected completion date',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date string' })
  due_date?: string;
}

export class ProcessApprovalDto {
  @ApiProperty({ 
    example: 'APPROVE', 
    description: 'Action to perform',
    enum: ApprovalAction
  })
  @IsEnum(ApprovalAction, { message: 'Invalid approval action' })
  action: ApprovalAction;

  @ApiProperty({ 
    example: 'Approved - all documents are in order', 
    description: 'Comments for this action',
    required: false
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ 
    example: 'user-id-456', 
    description: 'User to forward to (for FORWARD action)',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'Forward to user ID must be a valid UUID' })
  forward_to_user_id?: string;

  @ApiProperty({ 
    example: 'Please review the updated amounts', 
    description: 'Instructions when forwarding',
    required: false
  })
  @IsOptional()
  @IsString()
  forward_instructions?: string;

  @ApiProperty({ 
    example: { 
      approved_amount: 200.00, 
      notes: 'Reduced from requested amount due to company policy'
    }, 
    description: 'Additional data for approval',
    required: false
  })
  @IsOptional()
  @IsObject()
  approval_data?: object;
}

export class ApprovalQueryDto {
  @ApiProperty({ 
    example: 1, 
    description: 'Page number', 
    required: false, 
    default: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a valid number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ 
    example: 20, 
    description: 'Items per page', 
    required: false, 
    default: 20 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 20;

  @ApiProperty({ 
    example: 'PENDING', 
    description: 'Filter by status',
    enum: ApprovalStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(ApprovalStatus, { message: 'Invalid status' })
  status?: ApprovalStatus;

  @ApiProperty({ 
    example: 'category-id-123', 
    description: 'Filter by category ID',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  category_id?: string;

  @ApiProperty({ 
    example: 'user-id-123', 
    description: 'Filter by requester ID',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'Requester ID must be a valid UUID' })
  requester_id?: string;

  @ApiProperty({ 
    example: '2024-03-01', 
    description: 'Filter by start date (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string' })
  start_date?: string;

  @ApiProperty({ 
    example: '2024-03-31', 
    description: 'Filter by end date (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string' })
  end_date?: string;

  @ApiProperty({ 
    example: 'expense', 
    description: 'Search term',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    example: 'inbox', 
    description: 'View type: inbox (awaiting my approval), outbox (my requests), drafts',
    required: false
  })
  @IsOptional()
  @IsEnum(['inbox', 'outbox', 'drafts', 'all'], { message: 'Invalid view type' })
  view?: string;
}

export class BulkApprovalImportDto {
  @ApiProperty({
    example: [
      {
        categoryId: 'category-123',
        title: 'Expense Claim',
        requesterId: 'user-456',
        formData: { amount: 100, description: 'Office supplies' },
        status: 'APPROVED'
      }
    ],
    description: 'Array of approval records to import'
  })
  records: {
    categoryId: string;
    title: string;
    requesterId: string;
    formData: object;
    status?: string;
    approvalRoute?: ApprovalRouteStepDto[];
    attachments?: string[];
  }[];
}

export class ApprovalStatisticsQueryDto {
  @ApiProperty({ 
    example: 'month', 
    description: 'Period for statistics',
    enum: ['week', 'month', 'quarter', 'year'],
    required: false,
    default: 'month'
  })
  @IsOptional()
  @IsEnum(['week', 'month', 'quarter', 'year'], { message: 'Invalid period' })
  period?: string = 'month';

  @ApiProperty({ 
    example: 'category-id-123', 
    description: 'Filter by category ID',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'Category ID must be a valid UUID' })
  category_id?: string;

  @ApiProperty({ 
    example: 'user-id-123', 
    description: 'Filter by user ID',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id?: string;
}