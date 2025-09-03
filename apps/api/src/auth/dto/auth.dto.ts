import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 8 chars, must contain uppercase, lowercase, number, and special character)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number', required: false })
  @IsOptional()
  @IsPhoneNumber(null, { message: 'Please provide a valid phone number' })
  phone?: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Job title', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title?: string;

  @ApiProperty({ example: 'EMP001', description: 'Employee number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Employee number must not exceed 50 characters' })
  employee_number?: string;

  @ApiProperty({ example: 'Engineering', description: 'Department', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Department must not exceed 100 characters' })
  department?: string;

  @ApiProperty({ example: 'company-invitation-token', description: 'Company invitation token', required: false })
  @IsOptional()
  @IsString()
  invitation_token?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-from-email', description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecurePass123!', description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePass123!', description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  newPassword: string;
}