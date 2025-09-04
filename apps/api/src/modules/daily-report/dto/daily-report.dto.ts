import { IsString, IsOptional, IsArray, IsInt, Min, IsDateString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDailyReportEntryDto {
  @ApiProperty({ description: 'Category ID for this entry' })
  @IsString()
  category_id: string;

  @ApiProperty({ description: 'Description of the task/activity' })
  @IsString()
  task_description: string;

  @ApiPropertyOptional({ description: 'What was produced/completed' })
  @IsOptional()
  @IsString()
  output?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_minutes?: number;

  @ApiPropertyOptional({ description: 'Array of programs/tools used', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  programs_used?: string[];
}

export class CreateDailyReportDto {
  @ApiProperty({ description: 'Report date in YYYY-MM-DD format' })
  @IsDateString()
  report_date: string;

  @ApiPropertyOptional({ description: 'Overall summary of the day' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Report entries', type: [CreateDailyReportEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDailyReportEntryDto)
  entries?: CreateDailyReportEntryDto[];
}

export class UpdateDailyReportDto {
  @ApiPropertyOptional({ description: 'Overall summary of the day' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ 
    description: 'Report status', 
    enum: ['DRAFT', 'SUBMITTED'] 
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'SUBMITTED'])
  status?: 'DRAFT' | 'SUBMITTED';
}

export class ReviewReportDto {
  @ApiProperty({ 
    description: 'Review decision', 
    enum: ['APPROVED', 'REJECTED'] 
  })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}

export class GetReportsQueryDto {
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

export class GetTeamReportsQueryDto extends GetReportsQueryDto {
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