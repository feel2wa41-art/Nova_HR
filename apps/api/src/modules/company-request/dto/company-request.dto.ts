import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CompanyRequestStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export class CreateCompanyRequestDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  company_name: string;

  @ApiPropertyOptional({ description: 'Business registration number' })
  @IsOptional()
  @IsString()
  business_number?: string;

  @ApiProperty({ description: 'CEO name' })
  @IsString()
  ceo_name: string;

  @ApiProperty({ description: 'Contact email' })
  @IsEmail()
  contact_email: string;

  @ApiProperty({ description: 'Contact phone' })
  @IsString()
  contact_phone: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Employee count range' })
  @IsOptional()
  @IsString()
  employee_count?: string;

  @ApiPropertyOptional({ description: 'Industry type' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveCompanyRequestDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Initial plan for the tenant' })
  @IsOptional()
  @IsEnum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE'])
  plan?: string;

  @ApiPropertyOptional({ description: 'Maximum users allowed' })
  @IsOptional()
  max_users?: number;
}

export class RejectCompanyRequestDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  rejection_reason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompanyRequestQueryDto {
  @ApiPropertyOptional({ enum: CompanyRequestStatus })
  @IsOptional()
  @IsEnum(CompanyRequestStatus)
  status?: CompanyRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number = 20;
}