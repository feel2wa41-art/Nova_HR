import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsInt, IsObject, IsUUID, IsNotEmpty, Min } from 'class-validator';

// Common Code Category DTOs
export class CreateCommonCodeCategoryDto {
  @ApiProperty({ description: '카테고리 코드', example: 'POSITION' })
  @IsString()
  @IsNotEmpty()
  category_code: string;

  @ApiProperty({ description: '카테고리 이름', example: '직급' })
  @IsString()
  @IsNotEmpty()
  category_name: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;
}

export class UpdateCommonCodeCategoryDto {
  @ApiPropertyOptional({ description: '카테고리 이름' })
  @IsOptional()
  @IsString()
  category_name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;
}

// Common Code DTOs
export class CreateCommonCodeDto {
  @ApiProperty({ description: '코드', example: 'MANAGER' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '코드 이름', example: '부장' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '상위 코드 ID' })
  @IsOptional()
  @IsUUID()
  parent_code_id?: string;

  @ApiPropertyOptional({ description: '추가 데이터 (JSON)' })
  @IsOptional()
  @IsObject()
  extra_data?: any;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;
}

export class UpdateCommonCodeDto {
  @ApiPropertyOptional({ description: '코드 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '상위 코드 ID' })
  @IsOptional()
  @IsUUID()
  parent_code_id?: string;

  @ApiPropertyOptional({ description: '추가 데이터 (JSON)' })
  @IsOptional()
  @IsObject()
  extra_data?: any;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;
}

// User Position/Grade DTOs
export class AssignUserPositionDto {
  @ApiProperty({ description: '직급 코드 ID' })
  @IsUUID()
  position_code_id: string;

  @ApiPropertyOptional({ description: '발효일', default: 'now' })
  @IsOptional()
  effective_date?: Date;

  @ApiPropertyOptional({ description: '주 직급 여부', default: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class AssignUserGradeDto {
  @ApiProperty({ description: '등급 코드 ID' })
  @IsUUID()
  grade_code_id: string;

  @ApiPropertyOptional({ description: '발효일', default: 'now' })
  @IsOptional()
  effective_date?: Date;

  @ApiPropertyOptional({ description: '주 등급 여부', default: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

// Expense Limit DTOs
export class CreateExpenseLimitDto {
  @ApiPropertyOptional({ description: '등급 코드 ID (등급별 설정 시)' })
  @IsOptional()
  @IsUUID()
  grade_code_id?: string;

  @ApiPropertyOptional({ description: '직급 코드 ID (직급별 설정 시)' })
  @IsOptional()
  @IsUUID()
  position_code_id?: string;

  @ApiProperty({ description: '비용 카테고리', example: 'HOTEL' })
  @IsString()
  @IsNotEmpty()
  expense_category: string;

  @ApiPropertyOptional({ description: '일일 한도' })
  @IsOptional()
  @Type(() => Number)
  daily_limit?: number;

  @ApiPropertyOptional({ description: '월별 한도' })
  @IsOptional()
  @Type(() => Number)
  monthly_limit?: number;

  @ApiPropertyOptional({ description: '연간 한도' })
  @IsOptional()
  @Type(() => Number)
  yearly_limit?: number;

  @ApiPropertyOptional({ description: '통화', default: 'IDR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: '승인 필요 여부', default: true })
  @IsOptional()
  @IsBoolean()
  approval_required?: boolean;

  @ApiPropertyOptional({ description: '자동 승인 한도' })
  @IsOptional()
  @Type(() => Number)
  auto_approval_limit?: number;
}

export class UpdateExpenseLimitDto {
  @ApiPropertyOptional({ description: '일일 한도' })
  @IsOptional()
  @Type(() => Number)
  daily_limit?: number;

  @ApiPropertyOptional({ description: '월별 한도' })
  @IsOptional()
  @Type(() => Number)
  monthly_limit?: number;

  @ApiPropertyOptional({ description: '연간 한도' })
  @IsOptional()
  @Type(() => Number)
  yearly_limit?: number;

  @ApiPropertyOptional({ description: '통화' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: '승인 필요 여부' })
  @IsOptional()
  @IsBoolean()
  approval_required?: boolean;

  @ApiPropertyOptional({ description: '자동 승인 한도' })
  @IsOptional()
  @Type(() => Number)
  auto_approval_limit?: number;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}