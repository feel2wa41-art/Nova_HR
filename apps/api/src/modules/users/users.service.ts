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

  async findById(id: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id },
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
  }) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id }
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

  async updatePassword(id: string, newPassword: string) {
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

  async deactivateUser(id: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id }
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

  async activateUser(id: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id }
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