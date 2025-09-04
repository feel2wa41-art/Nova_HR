import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PasswordResetService } from './password-reset.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

class RequestPasswordResetDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  newPassword: string;
}

@ApiTags('Password Reset')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent successfully' })
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return await this.passwordResetService.requestPasswordReset(body.email);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateToken(@Query('token') token: string) {
    const validation = await this.passwordResetService.validateResetToken(token);
    
    if (validation.valid) {
      const user = await this.passwordResetService.getUserByResetToken(token);
      return {
        valid: true,
        user: user ? {
          email: user.email,
          name: user.name
        } : null
      };
    }
    
    return { valid: false };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.passwordResetService.resetPassword(body.token, body.newPassword);
  }
}