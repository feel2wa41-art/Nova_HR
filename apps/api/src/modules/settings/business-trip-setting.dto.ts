import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserGrade {
  STAFF = 'STAFF',
  SENIOR = 'SENIOR',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
  EXECUTIVE = 'EXECUTIVE'
}

export class ExpenseLimitDto {
  @ApiProperty({ description: 'User grade', enum: UserGrade })
  @IsEnum(UserGrade)
  grade: UserGrade;

  @ApiProperty({ description: 'Daily accommodation limit' })
  @IsNumber()
  accommodation_limit: number;

  @ApiProperty({ description: 'Daily meal limit' })
  @IsNumber()
  meal_limit: number;

  @ApiProperty({ description: 'Daily transportation limit' })
  @IsNumber()
  transportation_limit: number;

  @ApiProperty({ description: 'Daily miscellaneous limit' })
  @IsNumber()
  miscellaneous_limit: number;
}

export class CreateBusinessTripSettingDto {
  @ApiProperty({ description: 'Setting name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Setting description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Currency code (e.g., IDR, USD)' })
  @IsNotEmpty()
  @IsString()
  currency_code: string;

  @ApiProperty({ description: 'Exchange rate to company base currency' })
  @IsNumber()
  exchange_rate: number;

  @ApiProperty({ description: 'Expense limits by grade', type: [ExpenseLimitDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLimitDto)
  expense_limits: ExpenseLimitDto[];

  @ApiProperty({ description: 'Auto-approval threshold', required: false })
  @IsOptional()
  @IsNumber()
  auto_approval_threshold?: number;

  @ApiProperty({ description: 'Require receipt for amounts above', required: false })
  @IsOptional()
  @IsNumber()
  receipt_required_threshold?: number;
}

export class UpdateBusinessTripSettingDto {
  @ApiProperty({ description: 'Setting name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Setting description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Currency code (e.g., IDR, USD)', required: false })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiProperty({ description: 'Exchange rate to company base currency', required: false })
  @IsOptional()
  @IsNumber()
  exchange_rate?: number;

  @ApiProperty({ description: 'Expense limits by grade', type: [ExpenseLimitDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLimitDto)
  expense_limits?: ExpenseLimitDto[];

  @ApiProperty({ description: 'Auto-approval threshold', required: false })
  @IsOptional()
  @IsNumber()
  auto_approval_threshold?: number;

  @ApiProperty({ description: 'Require receipt for amounts above', required: false })
  @IsOptional()
  @IsNumber()
  receipt_required_threshold?: number;
}