import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { HashService } from '../../shared/services/hash.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateCompanyLocationDto,
  UpdateSystemSettingsDto,
  GetAnalyticsDto,
  GetUserListDto,
  BulkUserActionDto,
  ResetPasswordDto,
  ReportPeriod
} from './dto/admin.dto';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  format
} from 'date-fns';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
  ) {}

  // User Management
  async createUser(adminId: string, adminCompanyId: string, dto: CreateUserDto, isGlobalAdmin: boolean = false) {
    try {
      // Check if admin has permission to create user in target company
      if (!isGlobalAdmin && dto.companyId !== adminCompanyId) {
        throw new ForbiddenException('Cannot create user in different company');
      }

      // Check if email already exists
      const existingUser = await this.prisma.auth_user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      // Verify company exists
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Hash password
      const hashedPassword = await this.hashService.hash(dto.password);

      // Create user
      const user = await this.prisma.auth_user.create({
        data: {
          email: dto.email,
          name: dto.name,
          password: hashedPassword,
          role: dto.role,
          tenant_id: dto.companyId,
          status: "ACTIVE",
          employee_profile: dto.empNo || dto.department || dto.phone ? {
            create: {
              emp_no: dto.empNo,
              department: dto.department,
              hire_date: new Date(),
            },
          } : undefined,
        },
        include: {
          tenant: true,
          employee_profile: true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Failed to create user:', error);
      if (error instanceof ConflictException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async updateUser(adminId: string, adminCompanyId: string, userId: string, dto: UpdateUserDto, isGlobalAdmin: boolean = false) {
    try {
      // Get user to update
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId },
        include: { employee_profile: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check permission
      if (!isGlobalAdmin && user.tenant_id !== adminCompanyId) {
        throw new ForbiddenException('Cannot update user from different company');
      }

      // Update user
      const updatedUser = await this.prisma.auth_user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          role: dto.role,
          status: dto.isActive ? "ACTIVE" : "INACTIVE",
          employee_profile: (dto.empNo !== undefined || dto.department !== undefined || dto.phone !== undefined) ? {
            upsert: {
              create: {
                emp_no: dto.empNo,
                department: dto.department,
                hire_date: new Date(),
              },
              update: {
                emp_no: dto.empNo,
                department: dto.department,
              },
            },
          } : undefined,
        },
        include: {
          tenant: true,
          employee_profile: true,
        },
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Failed to update user:', error);
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update user');
    }
  }

  async getUserList(adminCompanyId: string, dto: GetUserListDto, isGlobalAdmin: boolean = false) {
    try {
      const whereClause: any = {};

      // Company filter
      if (isGlobalAdmin && dto.companyId) {
        whereClause.tenant_id = dto.companyId;
      } else if (!isGlobalAdmin) {
        whereClause.tenant_id = adminCompanyId;
      }

      // Role filter
      if (dto.role) {
        whereClause.role = dto.role;
      }

      // Status filter
      if (dto.isActive !== undefined) {
        whereClause.status = dto.isActive ? "ACTIVE" : "INACTIVE";
      }

      // Department filter
      if (dto.department) {
        whereClause.employee_profile = {
          department: dto.department,
        };
      }

      // Search filter
      if (dto.search) {
        whereClause.OR = [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { email: { contains: dto.search, mode: 'insensitive' } },
          { employee_profile: { emp_no: { contains: dto.search, mode: 'insensitive' } } },
        ];
      }

      const skip = ((dto.page || 1) - 1) * (dto.limit || 20);

      const [users, total] = await Promise.all([
        this.prisma.auth_user.findMany({
          where: whereClause,
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
            employee_profile: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: dto.limit || 20,
        }),
        this.prisma.auth_user.count({ where: whereClause }),
      ]);

      // Remove passwords from response
      const usersWithoutPassword = users.map(({ password, ...user }) => user);

      return {
        users: usersWithoutPassword,
        pagination: {
          total,
          page: dto.page || 1,
          limit: dto.limit || 20,
          totalPages: Math.ceil(total / (dto.limit || 20)),
        },
      };
    } catch (error) {
      console.error('Failed to get user list:', error);
      throw new BadRequestException('Failed to retrieve user list');
    }
  }

  async deleteUser(adminId: string, adminCompanyId: string, userId: string, isGlobalAdmin: boolean = false) {
    try {
      // Get user to delete
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check permission
      if (!isGlobalAdmin && user.tenant_id !== adminCompanyId) {
        throw new ForbiddenException('Cannot delete user from different company');
      }

      // Don't allow deleting self
      if (userId === adminId) {
        throw new BadRequestException('Cannot delete yourself');
      }

      // Soft delete user
      await this.prisma.auth_user.update({
        where: { id: userId },
        data: {
          status: "INACTIVE",
          updated_at: new Date(),
        },
      });

      return { message: 'User deleted successfully' };
    } catch (error) {
      console.error('Failed to delete user:', error);
      if (error instanceof ForbiddenException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete user');
    }
  }

  async bulkUserAction(adminId: string, adminCompanyId: string, dto: BulkUserActionDto, isGlobalAdmin: boolean = false) {
    try {
      // Check permissions for all users
      const users = await this.prisma.auth_user.findMany({
        where: {
          id: { in: dto.userIds },
        },
        select: {
          id: true,
          tenant_id: true,
        },
      });

      if (!isGlobalAdmin) {
        const unauthorizedUsers = users.filter(user => user.tenant_id !== adminCompanyId);
        if (unauthorizedUsers.length > 0) {
          throw new ForbiddenException('Cannot perform action on users from different companies');
        }
      }

      // Don't allow actions on self
      if (dto.userIds.includes(adminId)) {
        throw new BadRequestException('Cannot perform bulk actions on yourself');
      }

      let updateData: any;
      switch (dto.action) {
        case 'activate':
          updateData = { status: "ACTIVE" };
          break;
        case 'deactivate':
          updateData = { status: "INACTIVE" };
          break;
        case 'delete':
          updateData = { status: "INACTIVE" };
          break;
        default:
          throw new BadRequestException('Invalid action');
      }

      const result = await this.prisma.auth_user.updateMany({
        where: {
          id: { in: dto.userIds },
        },
        data: updateData,
      });

      return {
        message: `${dto.action} completed successfully`,
        affectedUsers: result.count,
      };
    } catch (error) {
      console.error('Failed to perform bulk user action:', error);
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to perform bulk action');
    }
  }

  async resetPassword(adminId: string, adminCompanyId: string, dto: ResetPasswordDto, isGlobalAdmin: boolean = false) {
    try {
      // Get user
      const user = await this.prisma.auth_user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check permission
      if (!isGlobalAdmin && user.tenant_id !== adminCompanyId) {
        throw new ForbiddenException('Cannot reset password for user from different company');
      }

      // Hash new password
      const hashedPassword = await this.hashService.hash(dto.newPassword);

      // Update password
      await this.prisma.auth_user.update({
        where: { id: dto.userId },
        data: {
          password: hashedPassword,
          updated_at: new Date(),
        },
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      console.error('Failed to reset password:', error);
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  // Company Management
  async createCompany(dto: CreateCompanyDto, isGlobalAdmin: boolean = false) {
    try {
      if (!isGlobalAdmin) {
        throw new ForbiddenException('Global admin access required');
      }

      // Check if company domain already exists
      const existingCompany = await this.prisma.tenant.findUnique({
        where: { domain: dto.code },
      });

      if (existingCompany) {
        throw new ConflictException('Company code already exists');
      }

      const company = await this.prisma.tenant.create({
        data: {
          name: dto.name,
          domain: dto.code,
          status: "ACTIVE",
        },
      });

      return company;
    } catch (error) {
      console.error('Failed to create company:', error);
      if (error instanceof ForbiddenException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create company');
    }
  }

  async updateCompany(companyId: string, dto: UpdateCompanyDto, isGlobalAdmin: boolean = false) {
    try {
      if (!isGlobalAdmin) {
        throw new ForbiddenException('Global admin access required');
      }

      const company = await this.prisma.tenant.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      const updatedCompany = await this.prisma.tenant.update({
        where: { id: companyId },
        data: {
          name: dto.name,
          status: dto.isActive ? "ACTIVE" : "INACTIVE",
        },
      });

      return updatedCompany;
    } catch (error) {
      console.error('Failed to update company:', error);
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update company');
    }
  }

  async getCompanyList(isGlobalAdmin: boolean = false) {
    try {
      if (!isGlobalAdmin) {
        throw new ForbiddenException('Global admin access required');
      }

      const companies = await this.prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              companies: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return companies;
    } catch (error) {
      console.error('Failed to get company list:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve company list');
    }
  }

  // Company Location Management
  async createCompanyLocation(companyId: string, dto: CreateCompanyLocationDto, isGlobalAdmin: boolean = false, adminCompanyId?: string) {
    try {
      // Check permission
      if (!isGlobalAdmin && companyId !== adminCompanyId) {
        throw new ForbiddenException('Cannot create location for different company');
      }

      const location = await this.prisma.company_location.create({
        data: {
          company_id: companyId,
          name: dto.name,
          code: dto.code,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          radius_m: dto.radiusM || 200,
          wifi_ssids: dto.wifiSsids || [],
          ip_cidrs: [],
          web_checkin_allowed: dto.webCheckinAllowed ?? true,
          face_required: dto.faceRequired ?? false,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return location;
    } catch (error) {
      console.error('Failed to create company location:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to create company location');
    }
  }

  // Analytics and Reports
  async getSystemAnalytics(dto: GetAnalyticsDto, isGlobalAdmin: boolean = false, adminCompanyId?: string) {
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date, endDate: Date;

      if (dto.startDate && dto.endDate) {
        startDate = new Date(dto.startDate);
        endDate = new Date(dto.endDate);
      } else {
        switch (dto.period) {
          case ReportPeriod.DAILY:
            startDate = startOfDay(now);
            endDate = endOfDay(now);
            break;
          case ReportPeriod.WEEKLY:
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
          case ReportPeriod.MONTHLY:
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          case ReportPeriod.QUARTERLY:
            startDate = startOfQuarter(now);
            endDate = endOfQuarter(now);
            break;
          case ReportPeriod.YEARLY:
            startDate = startOfYear(now);
            endDate = endOfYear(now);
            break;
        }
      }

      // Build where clause
      const whereClause: any = {};
      
      if (isGlobalAdmin && dto.companyId) {
        whereClause.tenant_id = dto.companyId;
      } else if (!isGlobalAdmin && adminCompanyId) {
        whereClause.tenant_id = adminCompanyId;
      }

      // Get user statistics
      const [
        totalUsers,
        activeUsers,
        totalCompanies,
        attendanceRecords,
        attitudeSessions
      ] = await Promise.all([
        this.prisma.auth_user.count({
          where: whereClause,
        }),
        this.prisma.auth_user.count({
          where: {
            ...whereClause,
            status: "ACTIVE",
          },
        }),
        isGlobalAdmin ? this.prisma.tenant.count({
          where: { status: "ACTIVE" },
        }) : Promise.resolve(1),
        this.prisma.attendance.count({
          where: {
            ...whereClause,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.attitude_session.count({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            ...(whereClause.tenant_id ? {
              user: {
                tenant_id: whereClause.tenant_id,
              },
            } : {}),
          },
        }),
      ]);

      // Get attendance summary
      const attendanceStats = await this.prisma.attendance.groupBy({
        by: ['status'],
        where: {
          ...whereClause,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          status: true,
        },
      });

      const attendanceSummary = attendanceStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      return {
        period: dto.period,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalUsers,
          activeUsers,
          totalCompanies,
          attendanceRecords,
          attitudeSessions,
        },
        attendanceSummary,
      };
    } catch (error) {
      console.error('Failed to get system analytics:', error);
      throw new BadRequestException('Failed to retrieve system analytics');
    }
  }

  // System Settings
  async updateSystemSettings(companyId: string, dto: UpdateSystemSettingsDto, isGlobalAdmin: boolean = false, adminCompanyId?: string) {
    try {
      // Check permission
      if (!isGlobalAdmin && companyId !== adminCompanyId) {
        throw new ForbiddenException('Cannot update settings for different company');
      }

      // Update or create settings using the generic settings table
      const settings = await this.prisma.settings.upsert({
        where: {
          category_key_company_id: {
            category: "SYSTEM",
            key: "GENERAL",
            company_id: companyId,
          },
        },
        update: {
          value: dto as any,
          updated_at: new Date(),
        },
        create: {
          company_id: companyId,
          category: "SYSTEM",
          key: "GENERAL",
          value: dto as any,
        },
      });

      return settings;
    } catch (error) {
      console.error('Failed to update system settings:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update system settings');
    }
  }
}