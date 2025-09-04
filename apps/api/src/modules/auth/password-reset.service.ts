import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { EmailService } from '../email/email.service';
import { HashService } from '../../shared/services/hash.service';
import { randomBytes } from 'crypto';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly hashService: HashService
  ) {}

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.prisma.auth_user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success message for security (don't reveal if email exists)
    const successMessage = {
      message: '비밀번호 초기화 이메일이 발송되었습니다. 이메일을 확인해주세요.'
    };

    if (!user) {
      // Email doesn't exist, but return success for security
      return successMessage;
    }

    if (user.status !== 'ACTIVE') {
      // User account is not active, but return success for security
      return successMessage;
    }

    // Clean up old tokens for this user
    await this.prisma.password_reset_token.deleteMany({
      where: { user_id: user.id }
    });

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to database
    await this.prisma.password_reset_token.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt
      }
    });

    // Send reset email
    try {
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
      
      await this.emailService.sendPasswordResetEmail(user.email, {
        userName: user.name,
        resetUrl,
        expiresAt
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Clean up token if email fails
      await this.prisma.password_reset_token.deleteMany({
        where: { token }
      });
      throw new BadRequestException('이메일 발송에 실패했습니다. 다시 시도해주세요.');
    }

    return successMessage;
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    if (!token) {
      return { valid: false };
    }

    const resetToken = await this.prisma.password_reset_token.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      return { valid: false };
    }

    if (resetToken.used) {
      return { valid: false };
    }

    if (resetToken.expires_at < new Date()) {
      // Clean up expired token
      await this.prisma.password_reset_token.delete({
        where: { id: resetToken.id }
      });
      return { valid: false };
    }

    if (resetToken.user.status !== 'ACTIVE') {
      return { valid: false };
    }

    return { 
      valid: true, 
      userId: resetToken.user_id 
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Validate token
    const tokenValidation = await this.validateResetToken(token);
    
    if (!tokenValidation.valid || !tokenValidation.userId) {
      throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    }

    // Validate password strength
    if (!this.isPasswordValid(newPassword)) {
      throw new BadRequestException('비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다.');
    }

    // Hash new password
    const hashedPassword = await this.hashService.hash(newPassword);

    // Update password and mark token as used
    await this.prisma.$transaction(async (tx) => {
      // Update user password
      await tx.auth_user.update({
        where: { id: tokenValidation.userId },
        data: { 
          password: hashedPassword,
          updated_at: new Date()
        }
      });

      // Mark token as used
      await tx.password_reset_token.update({
        where: { token },
        data: { 
          used: true,
          updated_at: new Date()
        }
      });
    });

    // Clean up all other tokens for this user
    await this.prisma.password_reset_token.deleteMany({
      where: { 
        user_id: tokenValidation.userId,
        id: { not: (await this.prisma.password_reset_token.findUnique({ where: { token } }))?.id }
      }
    });

    return { message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.' };
  }

  private isPasswordValid(password: string): boolean {
    // At least 8 characters
    if (password.length < 8) return false;
    
    // Contains uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    
    // Contains lowercase letter  
    if (!/[a-z]/.test(password)) return false;
    
    // Contains number
    if (!/\d/.test(password)) return false;
    
    // Contains special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    
    return true;
  }

  async getUserByResetToken(token: string) {
    const resetToken = await this.prisma.password_reset_token.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!resetToken || resetToken.used || resetToken.expires_at < new Date()) {
      return null;
    }

    return resetToken.user;
  }
}