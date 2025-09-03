import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsNumber, Min, IsEnum, IsArray, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  PERSONAL = 'PERSONAL',
  BEREAVEMENT = 'BEREAVEMENT',
  UNPAID = 'UNPAID',
  HALF_DAY = 'HALF_DAY',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class CreateLeaveRequestDto {
  @ApiProperty({ 
    example: 'ANNUAL', 
    description: 'Type of leave',
    enum: LeaveType
  })
  @IsEnum(LeaveType, { message: 'Invalid leave type' })
  leave_type: LeaveType;

  @ApiProperty({ 
    example: '2024-03-15', 
    description: 'Start date of leave (YYYY-MM-DD)' 
  })
  @IsDateString({}, { message: 'Start date must be a valid date string (YYYY-MM-DD)' })
  start_date: string;

  @ApiProperty({ 
    example: '2024-03-17', 
    description: 'End date of leave (YYYY-MM-DD)' 
  })
  @IsDateString({}, { message: 'End date must be a valid date string (YYYY-MM-DD)' })
  end_date: string;

  @ApiProperty({ 
    example: 'Need time off for personal matters', 
    description: 'Reason for leave request' 
  })
  @IsString({ message: 'Reason must be a string' })
  reason: string;

  @ApiProperty({ 
    example: 'morning', 
    description: 'Half day period (morning/afternoon) - only for HALF_DAY type',
    required: false
  })
  @IsOptional()
  @IsEnum(['morning', 'afternoon'], { message: 'Half day period must be morning or afternoon' })
  half_day_period?: string;

  @ApiProperty({ 
    example: ['document1.pdf', 'medical_certificate.pdf'], 
    description: 'Supporting documents',
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Supporting documents must be an array' })
  @IsString({ each: true, message: 'Each document must be a string' })
  supporting_documents?: string[];

  @ApiProperty({ 
    example: 'Will delegate tasks to John Doe', 
    description: 'Work delegation plan',
    required: false
  })
  @IsOptional()
  @IsString()
  delegation_notes?: string;

  @ApiProperty({ 
    example: 'user-id-123', 
    description: 'Emergency contact person ID',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'Emergency contact must be a valid UUID' })
  emergency_contact_id?: string;
}

export class UpdateLeaveRequestDto {
  @ApiProperty({ 
    example: 'ANNUAL', 
    description: 'Type of leave',
    enum: LeaveType,
    required: false
  })
  @IsOptional()
  @IsEnum(LeaveType, { message: 'Invalid leave type' })
  leave_type?: LeaveType;

  @ApiProperty({ 
    example: '2024-03-15', 
    description: 'Start date of leave (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string (YYYY-MM-DD)' })
  start_date?: string;

  @ApiProperty({ 
    example: '2024-03-17', 
    description: 'End date of leave (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string (YYYY-MM-DD)' })
  end_date?: string;

  @ApiProperty({ 
    example: 'Updated reason for leave request', 
    description: 'Reason for leave request',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @ApiProperty({ 
    example: 'morning', 
    description: 'Half day period (morning/afternoon) - only for HALF_DAY type',
    required: false
  })
  @IsOptional()
  @IsEnum(['morning', 'afternoon'], { message: 'Half day period must be morning or afternoon' })
  half_day_period?: string;

  @ApiProperty({ 
    example: ['document1.pdf', 'medical_certificate.pdf'], 
    description: 'Supporting documents',
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Supporting documents must be an array' })
  @IsString({ each: true, message: 'Each document must be a string' })
  supporting_documents?: string[];

  @ApiProperty({ 
    example: 'Updated delegation plan', 
    description: 'Work delegation plan',
    required: false
  })
  @IsOptional()
  @IsString()
  delegation_notes?: string;

  @ApiProperty({ 
    example: 'user-id-123', 
    description: 'Emergency contact person ID',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'Emergency contact must be a valid UUID' })
  emergency_contact_id?: string;
}

export class LeaveRequestQueryDto {
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
    enum: LeaveStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(LeaveStatus, { message: 'Invalid status' })
  status?: LeaveStatus;

  @ApiProperty({ 
    example: 'ANNUAL', 
    description: 'Filter by leave type',
    enum: LeaveType,
    required: false
  })
  @IsOptional()
  @IsEnum(LeaveType, { message: 'Invalid leave type' })
  leave_type?: LeaveType;

  @ApiProperty({ 
    example: '2024-01-01', 
    description: 'Filter by start date (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string (YYYY-MM-DD)' })
  start_date?: string;

  @ApiProperty({ 
    example: '2024-12-31', 
    description: 'Filter by end date (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string (YYYY-MM-DD)' })
  end_date?: string;

  @ApiProperty({ 
    example: 'user-id-123', 
    description: 'Filter by user ID (admin only)',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id?: string;
}

export class ApproveLeaveRequestDto {
  @ApiProperty({ 
    example: 'Approved for personal reasons', 
    description: 'Approval notes',
    required: false
  })
  @IsOptional()
  @IsString()
  approval_notes?: string;

  @ApiProperty({ 
    example: '2024-03-15', 
    description: 'Approved start date (if different from requested)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Approved start date must be a valid date string (YYYY-MM-DD)' })
  approved_start_date?: string;

  @ApiProperty({ 
    example: '2024-03-17', 
    description: 'Approved end date (if different from requested)',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Approved end date must be a valid date string (YYYY-MM-DD)' })
  approved_end_date?: string;

  @ApiProperty({ 
    example: 5, 
    description: 'Approved days (if different from calculated)',
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Approved days must be a valid number' })
  @Min(0.5, { message: 'Approved days must be at least 0.5' })
  approved_days?: number;
}

export class RejectLeaveRequestDto {
  @ApiProperty({ 
    example: 'Insufficient annual leave balance', 
    description: 'Reason for rejection' 
  })
  @IsString({ message: 'Rejection reason is required' })
  rejection_reason: string;

  @ApiProperty({ 
    example: 'Please resubmit after accruing more leave days', 
    description: 'Additional notes for the employee',
    required: false
  })
  @IsOptional()
  @IsString()
  rejection_notes?: string;
}

export class LeaveBalanceQueryDto {
  @ApiProperty({ 
    example: 2024, 
    description: 'Year for balance calculation',
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Year must be a valid number' })
  year?: number;

  @ApiProperty({ 
    example: 'user-id-123', 
    description: 'User ID (admin only)',
    required: false
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id?: string;
}

export class BulkLeaveImportDto {
  @ApiProperty({
    example: [
      {
        employeeId: 'EMP001',
        leaveType: 'ANNUAL',
        startDate: '2024-03-15',
        endDate: '2024-03-17',
        reason: 'Family vacation',
        status: 'APPROVED'
      }
    ],
    description: 'Array of leave records to import'
  })
  records: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status?: string;
    approvalNotes?: string;
  }[];
}

export class LeaveSettingsDto {
  @ApiProperty({ 
    example: 21, 
    description: 'Annual leave entitlement per year' 
  })
  @IsNumber({}, { message: 'Annual leave days must be a valid number' })
  @Min(0, { message: 'Annual leave days must be non-negative' })
  annual_leave_days: number;

  @ApiProperty({ 
    example: 10, 
    description: 'Sick leave entitlement per year' 
  })
  @IsNumber({}, { message: 'Sick leave days must be a valid number' })
  @Min(0, { message: 'Sick leave days must be non-negative' })
  sick_leave_days: number;

  @ApiProperty({ 
    example: 5, 
    description: 'Maximum carry over days to next year' 
  })
  @IsNumber({}, { message: 'Max carry over days must be a valid number' })
  @Min(0, { message: 'Max carry over days must be non-negative' })
  max_carry_over_days: number;

  @ApiProperty({ 
    example: true, 
    description: 'Whether to require approval for leave requests' 
  })
  require_approval: boolean;

  @ApiProperty({ 
    example: 7, 
    description: 'Minimum advance notice required in days' 
  })
  @IsNumber({}, { message: 'Advance notice days must be a valid number' })
  @Min(0, { message: 'Advance notice days must be non-negative' })
  advance_notice_days: number;
}