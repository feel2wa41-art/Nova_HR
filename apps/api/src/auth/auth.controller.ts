import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { EnhancedJwtAuthGuard } from './guards/enhanced-jwt.guard';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { auth_user } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            title: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
          }
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' }
      }
    }
  })
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Request() req) {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    return this.authService.login(loginDto, { ip, userAgent });
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        expiresIn: { type: 'number' }
      }
    }
  })
  async refresh(@Body(ValidationPipe) refreshDto: RefreshTokenDto, @Request() req) {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];
    
    return this.authService.refreshToken(refreshDto.refreshToken, { ip, userAgent });
  }

  @Get('profile')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        title: { type: 'string' },
        avatar_url: { type: 'string' },
        employee_profile: {
          type: 'object',
          properties: {
            department: { type: 'string' },
            emp_no: { type: 'string' }
          }
        },
        company: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        permissions: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getProfile(@Request() req) {
    const userId = req.user.sub;
    return this.authService.getUserProfile(userId);
  }

  @Post('logout')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req) {
    const token = this.extractTokenFromRequest(req);
    const userId = req.user.sub;
    
    return this.authService.logout(userId, token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string
  ) {
    return this.authService.resetPassword(token, password);
  }

  @Post('change-password')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string
  ) {
    const userId = req.user.sub;
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @Get('sessions')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved' })
  async getActiveSessions(@Request() req) {
    const userId = req.user.sub;
    return this.authService.getActiveSessions(userId);
  }

  @Post('sessions/:sessionId/revoke')
  @UseGuards(EnhancedJwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(
    @Request() req,
    @Body('sessionId') sessionId: string
  ) {
    const userId = req.user.sub;
    return this.authService.revokeSession(userId, sessionId);
  }

  private getClientIP(req: any): string {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private extractTokenFromRequest(req: any): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return '';
  }
}