import { IsEmail, IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  CUSTOMER_ADMIN = 'CUSTOMER_ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  TEAM_LEADER = 'TEAM_LEADER',
  EMPLOYEE = 'EMPLOYEE'
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: '개발팀' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'org-unit-id' })
  @IsOptional()
  @IsString()
  org_id?: string;
}

export class InviteUserDto {
  @ApiProperty({ example: 'user@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: '개발자' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'org-unit-id' })
  @IsOptional()
  @IsString()
  org_id?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: '홍길동' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: '개발자' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'org-unit-id' })
  @IsOptional()
  @IsString()
  org_id?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: 'newPassword123!' })
  @IsString()
  confirmPassword: string;
}