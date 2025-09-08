import { IsBoolean, IsOptional, IsString, IsInt, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  attendance_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  leave_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approval_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hr_community_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  calendar_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  geofence_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  face_recognition_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  qr_checkin_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overtime_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remote_work_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  annual_leave_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sick_leave_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  special_leave_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  leave_calendar_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auto_approval_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dynamic_forms_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  parallel_approval_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  deputy_approval_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bulk_approval_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  company_notice_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  team_board_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  survey_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anonymous_post_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ai_assistant_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  analytics_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  custom_reports_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  api_access_enabled?: boolean;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  TEAM_LEADER = 'TEAM_LEADER',
  EMPLOYEE = 'EMPLOYEE'
}

export enum PermissionScope {
  SELF = 'SELF',
  TEAM = 'TEAM',
  DEPARTMENT = 'DEPARTMENT',
  COMPANY = 'COMPANY'
}

export class MenuPermissionDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty()
  @IsString()
  menu_key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_view?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_create?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_edit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_delete?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_approve?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  can_export?: boolean;

  @ApiPropertyOptional({ enum: PermissionScope })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional()
  @IsOptional()
  custom_rules?: any;
}

export class UpdateMenuPermissionsDto {
  @ApiProperty({ type: [MenuPermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuPermissionDto)
  permissions: MenuPermissionDto[];
}

export enum ResetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export class FeatureLimitDto {
  @ApiProperty()
  @IsString()
  feature_key: string;

  @ApiProperty()
  @IsInt()
  limit_value: number;

  @ApiPropertyOptional({ enum: ResetPeriod })
  @IsOptional()
  @IsEnum(ResetPeriod)
  reset_period?: ResetPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  warning_threshold?: number;
}

export class UpdateFeatureLimitsDto {
  @ApiProperty({ type: [FeatureLimitDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureLimitDto)
  limits: FeatureLimitDto[];
}