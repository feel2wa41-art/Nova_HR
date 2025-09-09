import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsDecimal, 
  IsDateString, 
  IsEnum, 
  IsUUID, 
  IsNotEmpty, 
  IsPositive,
  IsInt,
  Min,
  Max
} from 'class-validator';

export enum OvertimeType {
  EVENING = 'EVENING',     // 야근
  WEEKEND = 'WEEKEND',     // 주말근무
  HOLIDAY = 'HOLIDAY',     // 특근 (공휴일)
  EARLY = 'EARLY'          // 조기출근
}

export enum OvertimeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Overtime Request DTOs
export class CreateOvertimeRequestDto {
  @ApiProperty({ description: '추가근무 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: OvertimeType, description: '추가근무 유형' })
  @IsEnum(OvertimeType)
  overtime_type: OvertimeType;

  @ApiProperty({ description: '추가근무 날짜', type: 'string', format: 'date' })
  @IsDateString()
  work_date: string;

  @ApiProperty({ description: '시작 시간', type: 'string', format: 'date-time' })
  @IsDateString()
  start_time: string;

  @ApiProperty({ description: '종료 시간', type: 'string', format: 'date-time' })
  @IsDateString()
  end_time: string;

  @ApiProperty({ description: '추가근무 내용' })
  @IsString()
  @IsNotEmpty()
  work_description: string;

  @ApiProperty({ description: '추가근무 사유' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: '전자결재 문서 ID' })
  @IsOptional()
  @IsUUID()
  approval_draft_id?: string;
}

export class UpdateOvertimeRequestDto {
  @ApiPropertyOptional({ description: '추가근무 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: OvertimeType, description: '추가근무 유형' })
  @IsOptional()
  @IsEnum(OvertimeType)
  overtime_type?: OvertimeType;

  @ApiPropertyOptional({ description: '추가근무 날짜', type: 'string', format: 'date' })
  @IsOptional()
  @IsDateString()
  work_date?: string;

  @ApiPropertyOptional({ description: '시작 시간', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiPropertyOptional({ description: '종료 시간', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  end_time?: string;

  @ApiPropertyOptional({ description: '추가근무 내용' })
  @IsOptional()
  @IsString()
  work_description?: string;

  @ApiPropertyOptional({ description: '추가근무 사유' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: OvertimeStatus, description: '상태' })
  @IsOptional()
  @IsEnum(OvertimeStatus)
  status?: OvertimeStatus;
}

export class ApproveOvertimeRequestDto {
  @ApiPropertyOptional({ description: '승인된 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  approved_hours?: number;

  @ApiPropertyOptional({ description: '시간당 수당' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  hourly_rate?: number;

  @ApiPropertyOptional({ description: '승인 의견' })
  @IsOptional()
  @IsString()
  approval_comment?: string;
}

export class RejectOvertimeRequestDto {
  @ApiProperty({ description: '거절 사유' })
  @IsString()
  @IsNotEmpty()
  rejection_reason: string;
}

// File Upload DTO
export class UploadOvertimeAttachmentDto {
  @ApiProperty({ description: '파일 이름' })
  @IsString()
  @IsNotEmpty()
  file_name: string;

  @ApiProperty({ description: '파일 경로' })
  @IsString()
  @IsNotEmpty()
  file_path: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  file_size: number;

  @ApiProperty({ description: '파일 타입' })
  @IsString()
  @IsNotEmpty()
  file_type: string;
}

// Overtime Policy DTOs
export class CreateOvertimePolicyDto {
  @ApiProperty({ description: '정책 이름' })
  @IsString()
  @IsNotEmpty()
  policy_name: string;

  @ApiProperty({ enum: OvertimeType, description: '추가근무 유형' })
  @IsEnum(OvertimeType)
  overtime_type: OvertimeType;

  @ApiPropertyOptional({ description: '일일 최대 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(24)
  max_daily_hours?: number;

  @ApiPropertyOptional({ description: '주간 최대 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  max_weekly_hours?: number;

  @ApiPropertyOptional({ description: '월간 최대 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  max_monthly_hours?: number;

  @ApiPropertyOptional({ description: '기본 시간당 수당' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  base_hourly_rate?: number;

  @ApiPropertyOptional({ description: '수당 배율', default: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  rate_multiplier?: number;

  @ApiPropertyOptional({ description: '승인 필요 여부', default: true })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @ApiPropertyOptional({ description: '자동 승인 가능한 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  auto_approval_hours?: number;

  @ApiPropertyOptional({ description: '사전 신청 필수 시간' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  advance_notice_hours?: number;

  @ApiPropertyOptional({ description: '적용 가능한 역할/직급' })
  @IsOptional()
  applicable_roles?: string[];

  @ApiPropertyOptional({ description: '적용 가능한 부서' })
  @IsOptional()
  applicable_departments?: string[];

  @ApiPropertyOptional({ description: '정책 발효일', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({ description: '정책 종료일', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effective_until?: string;
}

export class UpdateOvertimePolicyDto {
  @ApiPropertyOptional({ description: '정책 이름' })
  @IsOptional()
  @IsString()
  policy_name?: string;

  @ApiPropertyOptional({ description: '일일 최대 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(24)
  max_daily_hours?: number;

  @ApiPropertyOptional({ description: '주간 최대 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  max_weekly_hours?: number;

  @ApiPropertyOptional({ description: '월간 최대 추가근무 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  max_monthly_hours?: number;

  @ApiPropertyOptional({ description: '기본 시간당 수당' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  base_hourly_rate?: number;

  @ApiPropertyOptional({ description: '수당 배율' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  rate_multiplier?: number;

  @ApiPropertyOptional({ description: '승인 필요 여부' })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @ApiPropertyOptional({ description: '자동 승인 가능한 시간' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  auto_approval_hours?: number;

  @ApiPropertyOptional({ description: '사전 신청 필수 시간' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  advance_notice_hours?: number;

  @ApiPropertyOptional({ description: '적용 가능한 역할/직급' })
  @IsOptional()
  applicable_roles?: string[];

  @ApiPropertyOptional({ description: '적용 가능한 부서' })
  @IsOptional()
  applicable_departments?: string[];

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: '정책 발효일', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @ApiPropertyOptional({ description: '정책 종료일', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  effective_until?: string;
}

// Query DTOs
export class GetOvertimeRequestsDto {
  @ApiPropertyOptional({ description: '페이지', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: OvertimeType, description: '추가근무 유형 필터' })
  @IsOptional()
  @IsEnum(OvertimeType)
  overtime_type?: OvertimeType;

  @ApiPropertyOptional({ enum: OvertimeStatus, description: '상태 필터' })
  @IsOptional()
  @IsEnum(OvertimeStatus)
  status?: OvertimeStatus;

  @ApiPropertyOptional({ description: '시작 날짜 필터', type: 'string', format: 'date' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: '종료 날짜 필터', type: 'string', format: 'date' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: '사용자 ID 필터' })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}