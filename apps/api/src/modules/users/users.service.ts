import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { HashService } from '../../shared/services/hash.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService
  ) {}

  async findAll(tenantId?: string) {
    const where = tenantId ? { tenant_id: tenantId } : {};
    
    return this.prisma.auth_user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        avatar_url: true,
        status: true,
        role: true,
        language: true,
        last_login: true,
        created_at: true,
        employee_profile: {
          select: {
            emp_no: true,
            department: true,
            hire_date: true,
          }
        },
        org_unit: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async findById(id: string, tenantId?: string) {
    const where: any = { id };
    
    // Add tenant filtering if tenantId is provided
    if (tenantId) {
      where.tenant_id = tenantId;  // Tenant isolation security check
    }

    const user = await this.prisma.auth_user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        avatar_url: true,
        status: true,
        role: true,
        language: true,
        tenant_id: true,
        org_id: true,
        last_login: true,
        created_at: true,
        updated_at: true,
        employee_profile: {
          select: {
            emp_no: true,
            department: true,
            hire_date: true,
            employment_type: true,
            salary: true,
            base_location: {
              select: {
                name: true,
                address: true,
              }
            }
          }
        },
        org_unit: {
          select: {
            name: true,
          }
        },
        tenant: {
          select: {
            name: true,
            domain: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, updateData: {
    name?: string;
    title?: string;
    phone?: string;
    avatar_url?: string;
    status?: string;
    role?: string;
    language?: string;
    org_id?: string;
  }, tenantId?: string) {
    const where: any = { id };
    
    // Add tenant filtering if tenantId is provided
    if (tenantId) {
      where.tenant_id = tenantId;  // Tenant isolation security check
    }

    const user = await this.prisma.auth_user.findUnique({
      where
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.auth_user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        avatar_url: true,
        status: true,
        role: true,
        language: true,
        updated_at: true,
      }
    });
  }

  async updatePassword(id: string, newPassword: string, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id, tenant_id: tenantId }
      });
      if (!user) {
        throw new NotFoundException('User not found or access denied');
      }
    }
    const hashedPassword = await this.hashService.hash(newPassword);
    
    return this.prisma.auth_user.update({
      where: { id },
      data: { 
        password: hashedPassword,
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        updated_at: true,
      }
    });
  }

  async deactivateUser(id: string, tenantId?: string) {
    const where: any = { id };
    
    // Add tenant filtering if tenantId is provided
    if (tenantId) {
      where.tenant_id = tenantId;  // Tenant isolation security check
    }

    const user = await this.prisma.auth_user.findUnique({
      where
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'INACTIVE') {
      throw new BadRequestException('User is already inactive');
    }

    return this.prisma.auth_user.update({
      where: { id },
      data: { 
        status: 'INACTIVE',
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        status: true,
        updated_at: true,
      }
    });
  }

  async activateUser(id: string, tenantId?: string) {
    const where: any = { id };
    
    // Add tenant filtering if tenantId is provided
    if (tenantId) {
      where.tenant_id = tenantId;  // Tenant isolation security check
    }

    const user = await this.prisma.auth_user.findUnique({
      where
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.auth_user.update({
      where: { id },
      data: { 
        status: 'ACTIVE',
        updated_at: new Date()
      },
      select: {
        id: true,
        email: true,
        status: true,
        updated_at: true,
      }
    });
  }

  async createUser(createData: {
    email: string;
    password: string;
    name: string;
    title?: string;
    phone?: string;
    role: string;
    org_id?: string;
    tenant_id: string;
  }) {
    // Check if user already exists
    const existingUser = await this.prisma.auth_user.findUnique({
      where: { email: createData.email }
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashService.hash(createData.password);

    // Create user
    const user = await this.prisma.auth_user.create({
      data: {
        ...createData,
        password: hashedPassword,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        avatar_url: true,
        status: true,
        role: true,
        language: true,
        created_at: true,
        employee_profile: {
          select: {
            emp_no: true,
            department: true,
            hire_date: true,
          }
        },
        org_unit: {
          select: {
            name: true,
          }
        }
      }
    });

    return user;
  }

  async deleteUser(id: string, tenantId?: string) {
    const where: any = { id };
    
    // Add tenant filtering if tenantId is provided
    if (tenantId) {
      where.tenant_id = tenantId;  // Tenant isolation security check
    }

    const user = await this.prisma.auth_user.findUnique({
      where
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete related data first
    await this.prisma.employee_profile.deleteMany({
      where: { user_id: id }
    });

    await this.prisma.user_leave_balance.deleteMany({
      where: { user_id: id }
    });

    await this.prisma.attendance.deleteMany({
      where: { user_id: id }
    });

    // Delete the user
    await this.prisma.auth_user.delete({
      where: { id }
    });

    return { success: true, message: 'User deleted successfully' };
  }

  async findByCompany(companyId: string, tenantId?: string) {
    const where: any = {};
    
    // Add tenant filtering if tenantId is provided
    if (tenantId) {
      where.tenant_id = tenantId;
    }

    // Add company filtering through org_unit relation
    where.org_unit = {
      company_id: companyId
    };

    return this.prisma.auth_user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        avatar_url: true,
        status: true,
        role: true,
        language: true,
        last_login: true,
        created_at: true,
        employee_profile: {
          select: {
            emp_no: true,
            department: true,
            hire_date: true,
          }
        },
        org_unit: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getUserStats(tenantId?: string) {
    const where = tenantId ? { tenant_id: tenantId } : {};

    const [total, active, inactive, pending] = await Promise.all([
      this.prisma.auth_user.count({ where }),
      this.prisma.auth_user.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.auth_user.count({ where: { ...where, status: 'INACTIVE' } }),
      this.prisma.auth_user.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    const roleStats = await this.prisma.auth_user.groupBy({
      by: ['role'],
      where,
      _count: {
        id: true
      }
    });

    return {
      total,
      active,
      inactive,
      pending,
      roleStats: roleStats.map(stat => ({
        role: stat.role,
        count: stat._count.id
      }))
    };
  }
}