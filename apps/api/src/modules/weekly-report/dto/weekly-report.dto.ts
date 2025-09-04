import { IsString, IsOptional, IsArray, IsInt, Min, IsDateString, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWeeklyReportEntryDto {
  @ApiProperty({ description: 'Category ID for this entry' })
  @IsString()
  category_id: string;

  @ApiProperty({ description: 'Summary of work done in this category' })
  @IsString()
  summary: string;

  @ApiPropertyOptional({ description: 'Total hours spent in this category (minutes)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_hours?: number;

  @ApiPropertyOptional({ description: 'List of key tasks completed', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  key_tasks?: string[];

  @ApiPropertyOptional({ description: 'List of deliverables produced', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ description: 'Programs/tools used in this category', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  programs_used?: string[];
}

export class CreateWeeklyReportDto {
  @ApiProperty({ description: 'Week start date (Monday) in YYYY-MM-DD format' })
  @IsDateString()
  week_start: string;

  @ApiPropertyOptional({ description: 'Overall weekly summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Key achievements this week' })
  @IsOptional()
  @IsString()
  achievements?: string;

  @ApiPropertyOptional({ description: 'Challenges faced this week' })
  @IsOptional()
  @IsString()
  challenges?: string;

  @ApiPropertyOptional({ description: 'Goals for next week' })
  @IsOptional()
  @IsString()
  next_week_goals?: string;

  @ApiPropertyOptional({ description: 'Whether this report was auto-generated from daily reports', default: false })
  @IsOptional()
  @IsBoolean()
  is_auto_generated?: boolean;

  @ApiPropertyOptional({ description: 'IDs of daily reports used for auto-generation', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  daily_reports_included?: string[];

  @ApiPropertyOptional({ description: 'Report entries by category', type: [CreateWeeklyReportEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWeeklyReportEntryDto)
  entries?: CreateWeeklyReportEntryDto[];
}

export class UpdateWeeklyReportDto {
  @ApiPropertyOptional({ description: 'Overall weekly summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Key achievements this week' })
  @IsOptional()
  @IsString()
  achievements?: string;

  @ApiPropertyOptional({ description: 'Challenges faced this week' })
  @IsOptional()
  @IsString()
  challenges?: string;

  @ApiPropertyOptional({ description: 'Goals for next week' })
  @IsOptional()
  @IsString()
  next_week_goals?: string;

  @ApiPropertyOptional({ 
    description: 'Report status', 
    enum: ['DRAFT', 'SUBMITTED'] 
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'SUBMITTED'])
  status?: 'DRAFT' | 'SUBMITTED';
}

export class GenerateWeeklyReportDto {
  @ApiProperty({ description: 'Week start date (Monday) in YYYY-MM-DD format' })
  @IsDateString()
  week_start: string;
}

export class ReviewWeeklyReportDto {
  @ApiProperty({ 
    description: 'Review decision', 
    enum: ['APPROVED', 'REJECTED'] 
  })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}

export class GetWeeklyReportsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Filter by status', 
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] 
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])
  status?: string;
}

export class GetTeamWeeklyReportsQueryDto extends GetWeeklyReportsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by specific user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}