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
import { User, UserRole } from '@prisma/client';
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
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        company: true,
        employee_profile: true,
        role_permissions: {
          include: {
            permission: true,
          },
        },
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
      user.password_hash,
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
      permissions: user.role_permissions?.map((rp) => rp.permission.name) || [],
      companyId: user.company_id,
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
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
        last_login_ip: context.ip,
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
    const { email, password, name, phone, title, employee_number, department, invitation_token } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(password);

    // Handle invitation token if provided
    let companyId: string | undefined;
    let userRole: UserRole = UserRole.EMPLOYEE;

    if (invitation_token) {
      const invitation = await this.prisma.companyInvitation.findUnique({
        where: { token: invitation_token, expires_at: { gt: new Date() } },
      });

      if (!invitation) {
        throw new BadRequestException('Invalid or expired invitation token');
      }

      companyId = invitation.company_id;
      userRole = invitation.role || UserRole.EMPLOYEE;

      // Mark invitation as used
      await this.prisma.companyInvitation.update({
        where: { id: invitation.id },
        data: { used_at: new Date() },
      });
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        phone,
        title,
        role: userRole,
        company_id: companyId,
        status: 'ACTIVE',
        employee_profile: employee_number || department ? {
          create: {
            emp_no: employee_number,
            department,
          },
        } : undefined,
      },
      include: {
        company: true,
        employee_profile: true,
      },
    });

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = user;

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

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expires_at < new Date()) {
        throw new UnauthorizedException('Refresh token expired or not found');
      }

      // Validate session context (optional security check)
      if (this.configService.get('VALIDATE_IP_ADDRESS') === 'true') {
        if (storedToken.ip_address !== context.ip) {
          throw new UnauthorizedException('Token used from different IP address');
        }
      }

      // Generate new access token
      const newPayload = {
        sub: storedToken.user.id,
        email: storedToken.user.email,
        roles: [storedToken.user.role],
        permissions: [], // Would need to fetch from database
        companyId: storedToken.user.company_id,
        status: storedToken.user.status,
        sessionId: storedToken.session_id,
        ipAddress: context.ip,
        userAgent: context.userAgent,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      });

      // Update refresh token last used
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { last_used_at: new Date() },
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        employee_profile: true,
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      permissions: user.role_permissions?.map((rp) => rp.permission.name) || [],
    };
  }

  async logout(userId: string, token: string) {
    // Revoke all refresh tokens for this user's current session
    // This is a simplified approach - in production, you might want to be more granular
    await this.prisma.refreshToken.deleteMany({
      where: {
        user_id: userId,
        expires_at: { gt: new Date() },
      },
    });

    // Add token to blacklist (in production, use Redis)
    // For now, we'll rely on token expiration

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = this.passwordService.generateResetToken();
    const hashedToken = this.passwordService.hashResetToken(resetToken);

    // Save reset token (expires in 1 hour)
    await this.prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token: hashedToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send email with reset token
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = this.passwordService.hashResetToken(token);

    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        expires_at: { gt: new Date() },
        used_at: null,
      },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: resetRecord.user_id },
      data: { password_hash: passwordHash },
    });

    // Mark reset token as used
    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used_at: new Date() },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { user_id: resetRecord.user_id },
    });

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      user.password_hash,
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        user_id: userId,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map(session => ({
      id: session.session_id,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      createdAt: session.created_at,
      lastUsedAt: session.last_used_at,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        user_id: userId,
        session_id: sessionId,
      },
    });

    return { message: 'Session revoked successfully' };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    sessionId: string,
    context: { ip: string; userAgent: string },
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token: refreshToken,
        session_id: sessionId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        expires_at: expiresAt,
      },
    });
  }

  private async logFailedLogin(userId: string, ipAddress: string, reason: string) {
    await this.prisma.failedLoginAttempt.create({
      data: {
        user_id: userId,
        ip_address: ipAddress,
        reason,
        attempted_at: new Date(),
      },
    });
  }

  private async checkFailedLoginAttempts(userId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentFailures = await this.prisma.failedLoginAttempt.count({
      where: {
        user_id: userId,
        attempted_at: { gt: fiveMinutesAgo },
      },
    });

    if (recentFailures >= 5) {
      throw new UnauthorizedException('Too many failed login attempts. Please try again later.');
    }
  }

  private async clearFailedLoginAttempts(userId: string) {
    await this.prisma.failedLoginAttempt.deleteMany({
      where: { user_id: userId },
    });
  }
}