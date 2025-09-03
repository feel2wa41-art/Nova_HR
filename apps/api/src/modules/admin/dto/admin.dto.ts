import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsDateString, 
  IsArray, 
  ValidateNested, 
  IsBoolean,
  IsEnum,
  IsUUID,
  IsEmail,
  MinLength,
  Min,
  Max
} from 'class-validator';

// User Management DTOs
export class CreateUserDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'User role', enum: ['admin', 'hr_manager', 'employee'] })
  @IsEnum(['admin', 'hr_manager', 'employee'])
  role: string;

  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'Employee number', required: false })
  @IsOptional()
  @IsString()
  empNo?: string;

  @ApiProperty({ description: 'Department', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Position/Title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'User name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ description: 'User role', enum: ['admin', 'hr_manager', 'employee'], required: false })
  @IsOptional()
  @IsEnum(['admin', 'hr_manager', 'employee'])
  role?: string;

  @ApiProperty({ description: 'Employee number', required: false })
  @IsOptional()
  @IsString()
  empNo?: string;

  @ApiProperty({ description: 'Department', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Position/Title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Company Management DTOs
export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'Company code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Business number', required: false })
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiProperty({ description: 'Company address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Company phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Company email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateCompanyDto {
  @ApiProperty({ description: 'Company name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ description: 'Business number', required: false })
  @IsOptional()
  @IsString()
  businessNumber?: string;

  @ApiProperty({ description: 'Company address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Company phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Company email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Company status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Company Location Management DTOs
export class CreateCompanyLocationDto {
  @ApiProperty({ description: 'Location name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Location code', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Location address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  lng: number;

  @ApiProperty({ description: 'Geofence radius in meters', required: false, default: 200 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  radiusM?: number = 200;

  @ApiProperty({ description: 'Allowed WiFi SSIDs', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wifiSsids?: string[];

  @ApiProperty({ description: 'Web check-in allowed', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  webCheckinAllowed?: boolean = true;

  @ApiProperty({ description: 'Face verification required', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  faceRequired?: boolean = false;
}

// System Settings DTOs
export class UpdateSystemSettingsDto {
  @ApiProperty({ description: 'Working hours per day', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  workingHoursPerDay?: number;

  @ApiProperty({ description: 'Working days per week', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  workingDaysPerWeek?: number;

  @ApiProperty({ description: 'Default attendance radius in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  defaultAttendanceRadius?: number;

  @ApiProperty({ description: 'Allow remote work', required: false })
  @IsOptional()
  @IsBoolean()
  allowRemoteWork?: boolean;

  @ApiProperty({ description: 'Require face verification', required: false })
  @IsOptional()
  @IsBoolean()
  requireFaceVerification?: boolean;

  @ApiProperty({ description: 'Screenshot interval in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  screenshotInterval?: number;

  @ApiProperty({ description: 'Enable attitude monitoring', required: false })
  @IsOptional()
  @IsBoolean()
  enableAttitudeMonitoring?: boolean;
}

// Analytics DTOs
export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly', 
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export class GetAnalyticsDto {
  @ApiProperty({ description: 'Report period', enum: ReportPeriod })
  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @ApiProperty({ description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Company ID filter', required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ description: 'Department filter', required: false })
  @IsOptional()
  @IsString()
  department?: string;
}

export class GetUserListDto {
  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Role filter', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Department filter', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Company ID filter', required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ description: 'Status filter', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkUserActionDto {
  @ApiProperty({ description: 'User IDs', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  userIds: string[];

  @ApiProperty({ description: 'Action type', enum: ['activate', 'deactivate', 'delete'] })
  @IsEnum(['activate', 'deactivate', 'delete'])
  action: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}