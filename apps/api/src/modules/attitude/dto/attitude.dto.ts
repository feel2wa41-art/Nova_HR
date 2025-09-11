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
  Min,
  Max,
  IsUUID,
  IsEnum
} from 'class-validator';

export class SubmitScreenshotDto {
  @ApiProperty({ description: 'Screenshot file' })
  @IsOptional()
  screenshot?: any;

  @ApiProperty({ description: 'Screenshot metadata' })
  @IsOptional()
  @IsString()
  metadata?: string;

  @ApiProperty({ description: 'Timestamp when screenshot was taken' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Active window title', required: false })
  @IsOptional()
  @IsString()
  activeWindow?: string;

  @ApiProperty({ description: 'Screen resolution', required: false })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiProperty({ description: 'Application name', required: false })
  @IsOptional()
  @IsString()
  applicationName?: string;
}

export class ApplicationUsageDto {
  @ApiProperty({ description: 'Application name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Window title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Process name' })
  @IsString()
  processName: string;

  @ApiProperty({ description: 'Usage duration in seconds' })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty({ description: 'Start time' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: 'Is productive application', required: false })
  @IsOptional()
  @IsBoolean()
  isProductive?: boolean;

  @ApiProperty({ description: 'Application category', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

export class SubmitActivityDataDto {
  @ApiProperty({ description: 'Activity date' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Application usage data', type: [ApplicationUsageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationUsageDto)
  applications: ApplicationUsageDto[];

  @ApiProperty({ description: 'Total active time in seconds' })
  @IsNumber()
  @Min(0)
  totalActiveTime: number;

  @ApiProperty({ description: 'Idle time in seconds' })
  @IsNumber()
  @Min(0)
  idleTime: number;

  @ApiProperty({ description: 'Productivity score (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  productivityScore?: number;

  @ApiProperty({ description: 'Mouse clicks count', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mouseClicks?: number;

  @ApiProperty({ description: 'Keyboard strokes count', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  keyboardStrokes?: number;
}

export class GetAttitudeStatsDto {
  @ApiProperty({ description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Company ID', required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export enum AttitudePeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export class GetProductivityAnalyticsDto {
  @ApiProperty({ description: 'Analysis period', enum: AttitudePeriod })
  @IsEnum(AttitudePeriod)
  period: AttitudePeriod;

  @ApiProperty({ description: 'User ID for specific user analysis', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Department filter', required: false })
  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdateScreenshotStatusDto {
  @ApiProperty({ description: 'Screenshot ID' })
  @IsUUID()
  screenshotId: string;

  @ApiProperty({ description: 'Approval status' })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({ description: 'Review notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetScreenshotGalleryDto {
  @ApiProperty({ description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Department', required: false })
  @IsOptional()
  @IsString()
  department?: string;

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
}

export class LiveMonitoringDto {
  @ApiProperty({ description: 'User IDs to monitor', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @ApiProperty({ description: 'Department to monitor', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Include screenshots in response', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeScreenshots?: boolean = false;
}