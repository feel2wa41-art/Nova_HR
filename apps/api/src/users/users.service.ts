import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  Logger 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/prisma/prisma.service';
import { EmailService } from '../modules/email/email.service';
import { PasswordUtil } from '../shared/utils/password.util';
import { CreateUserDto, InviteUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  // 회사의 모든 사용자 조회 (관리자용)
  async getCompanyUsers(companyId: string, currentUserId: string) {
    // 현재 사용자가 해당 회사의 관리자인지 확인
    const currentUser = await this.prisma.auth_user.findUnique({
      where: { id: currentUserId },
      include: { tenant: { include: { companies: true } } }
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const hasPermission = currentUser.tenant?.companies.some(c => c.id === companyId) &&
                         ['CUSTOMER_ADMIN', 'HR_MANAGER'].includes(currentUser.role);

    if (!hasPermission) {
      throw new BadRequestException('Permission denied');
    }

    return await this.prisma.auth_user.findMany({
      where: {
        tenant: { companies: { some: { id: companyId } } },
        role: { in: ['CUSTOMER_ADMIN', 'HR_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] }
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        title: true,
        status: true,
        last_login: true,
        created_at: true,
        org_unit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // 사용자 초대 (이메일 발송)
  async inviteUser(companyId: string, dto: InviteUserDto, inviterId: string) {
    // 초대자 정보 확인
    const inviter = await this.prisma.auth_user.findUnique({
      where: { id: inviterId },
      include: { 
        tenant: { 
          include: { companies: true } 
        } 
      }
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const company = inviter.tenant?.companies.find(c => c.id === companyId);
    if (!company) {
      throw new BadRequestException('Company not found or access denied');
    }

    // 초대자가 관리자 권한인지 확인
    if (!['CUSTOMER_ADMIN', 'HR_MANAGER'].includes(inviter.role)) {
      throw new BadRequestException('Permission denied');
    }

    // 이미 존재하는 이메일인지 확인
    const existingUser = await this.prisma.auth_user.findUnique({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 임시 비밀번호 생성
    const tempPassword = PasswordUtil.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 트랜잭션으로 사용자 생성
    const result = await this.prisma.$transaction(async (tx) => {
      // 사용자 생성
      const newUser = await tx.auth_user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: dto.role,
          title: dto.title,
          tenant_id: inviter.tenant_id!,
          org_id: dto.org_id || null,
          status: 'ACTIVE'
        }
      });

      return {
        user: newUser,
        tempPassword
      };
    });

    // 초대 이메일 발송
    try {
      await this.emailService.sendUserInviteEmail(result.user.email, {
        userName: result.user.name,
        companyName: company.name,
        inviterName: inviter.name,
        email: result.user.email,
        tempPassword: result.tempPassword,
        loginUrl: `${this.configService.get('app.customerPortalUrl')}/login`,
        role: result.user.role
      });

      this.logger.log(`Invite email sent to ${result.user.email}`);
    } catch (error) {
      this.logger.error('Failed to send invite email', error);
      // 이메일 실패해도 사용자 생성은 유지
    }

    // 비밀번호 제외하고 반환
    const { password, ...userWithoutPassword } = result.user;
    return {
      user: userWithoutPassword,
      message: 'User invited successfully. Invitation email has been sent.'
    };
  }

  // 사용자 정보 업데이트
  async updateUser(userId: string, dto: UpdateUserDto, updaterId: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updater = await this.prisma.auth_user.findUnique({
      where: { id: updaterId }
    });

    if (!updater) {
      throw new NotFoundException('Updater not found');
    }

    // 권한 확인: 본인이거나 관리자여야 함
    const canUpdate = userId === updaterId || 
                     ['CUSTOMER_ADMIN', 'HR_MANAGER'].includes(updater.role);

    if (!canUpdate) {
      throw new BadRequestException('Permission denied');
    }

    // 업데이트
    const updatedUser = await this.prisma.auth_user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        title: true,
        status: true,
        org_unit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return updatedUser;
  }

  // 사용자 비활성화
  async deactivateUser(userId: string, deactivatorId: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deactivator = await this.prisma.auth_user.findUnique({
      where: { id: deactivatorId }
    });

    if (!deactivator) {
      throw new NotFoundException('Deactivator not found');
    }

    // 관리자만 다른 사용자를 비활성화할 수 있음
    if (!['CUSTOMER_ADMIN', 'HR_MANAGER'].includes(deactivator.role)) {
      throw new BadRequestException('Permission denied');
    }

    // 자기 자신은 비활성화할 수 없음
    if (userId === deactivatorId) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    await this.prisma.auth_user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' }
    });

    return { message: 'User deactivated successfully' };
  }

  // 비밀번호 변경
  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    // 비밀번호 강도 검증
    const validation = PasswordUtil.validatePasswordStrength(dto.newPassword);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // 일반적인 비밀번호인지 검증
    if (PasswordUtil.isCommonPassword(dto.newPassword)) {
      throw new BadRequestException('Password is too common. Please choose a more secure password.');
    }

    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // 새 비밀번호가 현재 비밀번호와 같은지 확인
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // 새 비밀번호 해시화 및 업데이트
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.auth_user.update({
      where: { id: userId },
      data: { 
        password: hashedNewPassword,
        updated_at: new Date()
      }
    });

    return { message: 'Password changed successfully' };
  }

  // 사용자 상세 정보 조회
  async getUserById(userId: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        title: true,
        status: true,
        last_login: true,
        created_at: true,
        org_unit: {
          select: {
            id: true,
            name: true,
            code: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
