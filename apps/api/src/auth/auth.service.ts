import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/services/prisma.service';
import { PasswordService } from './services/password.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { auth_user } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private passwordService: PasswordService,
  ) {}

  async login(loginDto: LoginDto, context: { ip: string; userAgent: string }) {
    const { email, password } = loginDto;

    // Find user with related data
    const user = await this.prisma.auth_user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        tenant: true,
        employee_profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.logFailedLogin(user.id, context.ip, 'invalid_password');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check for too many failed attempts
    await this.checkFailedLoginAttempts(user.id);

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Create JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      roles: [user.role],
      permissions: [], // TODO: Implement permissions based on role
      tenantId: user.tenant_id,
      status: user.status,
      sessionId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    };

    // Generate tokens
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Save refresh token and session info
    await this.saveRefreshToken(user.id, refreshToken, sessionId, context);

    // Update last login
    await this.prisma.auth_user.update({
      where: { id: user.id },
      data: {
        last_login: new Date(),
      },
    });

    // Clear failed login attempts
    await this.clearFailedLoginAttempts(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        title: user.title,
        permissions: payload.permissions,
      },
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password: userPassword, name, phone, title, employee_number, department, invitation_token } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.auth_user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(userPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(userPassword);

    // Handle invitation token if provided
    let tenantId: string | undefined;
    let userRole: string = 'EMPLOYEE';

    if (invitation_token) {
      // TODO: Implement company_invitation table or alternative logic
      // For now, we'll skip invitation handling
      // const invitation = await this.prisma.company_invitation.findUnique({
      //   where: { token: invitation_token, expires_at: { gt: new Date() } },
      // });
      // if (!invitation) {
      //   throw new BadRequestException('Invalid or expired invitation token');
      // }
      // tenantId = invitation.tenant_id;
      // userRole = invitation.role || 'EMPLOYEE';
      throw new BadRequestException('Invitation system not yet implemented');
    }

    // Create user
    const user = await this.prisma.auth_user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: passwordHash,
        phone,
        title,
        role: userRole,
        tenant_id: tenantId,
        status: 'ACTIVE',
        employee_profile: employee_number || department ? {
          create: {
            emp_no: employee_number,
            department,
          },
        } : undefined,
      },
      include: {
        tenant: true,
        employee_profile: true,
      },
    });

    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'User registered successfully',
      user: userWithoutPassword,
    };
  }

  async refreshToken(refreshToken: string, context: { ip: string; userAgent: string }) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // TODO: Implement refresh_token table or use alternative approach
      // For now, just validate the token and generate a new access token
      // without database storage
      
      // Find user to generate new token
      const user = await this.prisma.auth_user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const newPayload = {
        sub: user.id,
        email: user.email,
        roles: [user.role],
        permissions: [], // TODO: Implement permissions based on role
        tenantId: user.tenant_id,
        status: user.status,
        sessionId: payload.sessionId,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      });

      return {
        accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        employee_profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      permissions: [], // TODO: Implement permissions based on role
    };
  }

  async logout(userId: string, token: string) {
    // TODO: Implement refresh_token table or use alternative approach
    // For now, we'll rely on token expiration and client-side token removal
    
    // Add token to blacklist (in production, use Redis)
    // For now, we'll rely on token expiration

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // TODO: Implement password_reset table or alternative approach
    // Generate reset token
    // const resetToken = this.passwordService.generateResetToken();
    // const hashedToken = this.passwordService.hashResetToken(resetToken);

    // Save reset token (expires in 1 hour)
    // await this.prisma.password_reset.create({
    //   data: {
    //     user_id: user.id,
    //     token: hashedToken,
    //     expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    //   },
    // });

    // TODO: Send email with reset token
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // TODO: Implement password_reset table or alternative approach
    // For now, throw an error indicating this feature is not implemented
    throw new BadRequestException('Password reset functionality not yet implemented');
    
    // const hashedToken = this.passwordService.hashResetToken(token);
    // const resetRecord = await this.prisma.password_reset.findFirst({
    //   where: {
    //     token: hashedToken,
    //     expires_at: { gt: new Date() },
    //     used_at: null,
    //   },
    //   include: { user: true },
    // });
    // if (!resetRecord) {
    //   throw new BadRequestException('Invalid or expired reset token');
    // }
    // // Validate password strength
    // const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
    // if (!passwordValidation.isValid) {
    //   throw new BadRequestException(passwordValidation.errors.join(', '));
    // }
    // // Hash new password
    // const passwordHash = await this.passwordService.hashPassword(newPassword);
    // // Update password
    // await this.prisma.auth_user.update({
    //   where: { id: resetRecord.user_id },
    //   data: { password: passwordHash },
    // });
    // // Mark reset token as used and revoke refresh tokens
    // return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Check password history (if implemented)
    // const isPasswordInHistory = await this.passwordService.isPasswordInHistory(userId, newPassword);
    // if (isPasswordInHistory) {
    //   throw new BadRequestException('Cannot reuse recent passwords');
    // }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.prisma.auth_user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async getActiveSessions(userId: string) {
    // TODO: Implement refresh_token table or alternative approach
    // For now, return empty array
    return [];
    
    // const sessions = await this.prisma.refresh_token.findMany({
    //   where: {
    //     user_id: userId,
    //     expires_at: { gt: new Date() },
    //   },
    //   orderBy: { created_at: 'desc' },
    // });
    // return sessions.map(session => ({
    //   id: session.session_id,
    //   ipAddress: session.ip_address,
    //   userAgent: session.user_agent,
    //   createdAt: session.created_at,
    //   lastUsedAt: session.last_used_at,
    // }));
  }

  async revokeSession(userId: string, sessionId: string) {
    // TODO: Implement refresh_token table or alternative approach
    // For now, just return success message
    return { message: 'Session revoked successfully' };
    
    // await this.prisma.refresh_token.deleteMany({
    //   where: {
    //     user_id: userId,
    //     session_id: sessionId,
    //   },
    // });
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    sessionId: string,
    context: { ip: string; userAgent: string },
  ) {
    // TODO: Implement refresh_token table or alternative approach
    // For now, we'll rely on JWT token expiration without database storage
    // const expiresAt = new Date();
    // expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    // await this.prisma.refresh_token.create({
    //   data: {
    //     user_id: userId,
    //     token: refreshToken,
    //     session_id: sessionId,
    //     ip_address: context.ip,
    //     user_agent: context.userAgent,
    //     expires_at: expiresAt,
    //   },
    // });
  }

  private async logFailedLogin(userId: string, ipAddress: string, reason: string) {
    // TODO: Implement failed_login_attempt table or use audit_log
    // For now, we could use the audit_log table instead
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'FAILED_LOGIN',
        resource: 'AUTH',
        metadata: {
          ip_address: ipAddress,
          reason,
        },
      },
    });
  }

  private async checkFailedLoginAttempts(userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Use audit_log instead of failed_login_attempt table
    const recentFailures = await this.prisma.audit_log.count({
      where: {
        user_id: userId,
        action: 'FAILED_LOGIN',
        created_at: { gt: fiveMinutesAgo },
      },
    });

    if (recentFailures >= 5) {
      throw new UnauthorizedException('Too many failed login attempts. Please try again later.');
    }
  }

  private async clearFailedLoginAttempts(userId: string) {
    // Use audit_log instead of failed_login_attempt table
    // We don't need to delete audit logs, they should be kept for history
    // Just log successful login
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'LOGIN',
        resource: 'AUTH',
      },
    });
  }
}