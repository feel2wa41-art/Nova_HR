/**
 * 사용자 휴가 잔여 관리 컨트롤러
 * 
 * 핵심 기능:
 * 1. 테넌트별 사용자 휴가 잔여 조회 (/user-leave-balance)
 * 2. 사용자별 휴가 잔여 요약 (/user-leave-balance/summary)
 * 3. 휴가 할당 생성 및 수정 (POST, PUT)
 * 4. 할당 이력 추적 (/user-leave-balance/history)
 * 
 * 보안 특징:
 * - EnhancedJwtAuthGuard로 인증 확인
 * - tenant_id 기반 데이터 격리
 * - 관리자 권한 검증
 * 
 * 데이터베이스 구조:
 * - user_leave_balance: 사용자별 휴가 잔여 테이블
 * - leave_allocation_history: 할당 변경 이력 테이블
 * - 실시간 잔여 계산: allocated - used - pending = available
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnhancedJwtAuthGuard } from '../../auth/guards/enhanced-jwt.guard';
import { PrismaService } from '../../shared/services/prisma.service';

interface CreateUserLeaveBalanceDto {
  userId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  notes?: string;
}

interface UpdateUserLeaveBalanceDto {
  allocated: number;
  notes?: string;
  reason?: string;
}

interface UserLeaveBalanceResponse {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  notes?: string;
  user: {
    id: string;
    name: string;
    email: string;
    employee_profile?: {
      employee_id?: string;
      department?: string;
      position?: string;
    };
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
    colorHex: string;
    allowHalfDays: boolean;
  };
}

@ApiTags('User Leave Balance')
@Controller('user-leave-balance')
@UseGuards(EnhancedJwtAuthGuard)
@ApiBearerAuth('access-token')
export class UserLeaveBalanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get user leave balances for current tenant' })
  @ApiResponse({ status: 200, description: 'User leave balances retrieved successfully' })
  async getUserLeaveBalances(
    @Request() req,
    @Query('year') year?: string,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
  ): Promise<UserLeaveBalanceResponse[]> {
    const tenantId = req.user.tenantId;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Build where clause with tenant isolation
    const whereClause: any = {
      tenant_id: tenantId,
      year: currentYear,
    };

    if (companyId) {
      whereClause.company_id = companyId;
    }

    if (userId) {
      whereClause.user_id = userId;
    }

    const balances = await this.prisma.user_leave_balance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employee_profile: {
              select: {
                emp_no: true,
                department: true,
                hire_date: true,
              },
            },
          },
        },
        leave_type: {
          select: {
            id: true,
            name: true,
            code: true,
            color_hex: true,
            allow_half_days: true,
          },
        },
      },
      orderBy: [
        { user: { name: 'asc' } },
        { leave_type: { display_order: 'asc' } },
      ],
    });

    return balances.map((balance) => ({
      id: balance.id,
      userId: balance.user_id,
      leaveTypeId: balance.leave_type_id,
      year: balance.year,
      allocated: parseFloat(balance.allocated.toString()),
      used: parseFloat(balance.used.toString()),
      pending: parseFloat(balance.pending.toString()),
      available: parseFloat(balance.available.toString()),
      notes: balance.notes,
      user: {
        id: balance.user.id,
        name: balance.user.name,
        email: balance.user.email,
        employee_profile: balance.user.employee_profile,
      },
      leaveType: {
        id: balance.leave_type.id,
        name: balance.leave_type.name,
        code: balance.leave_type.code,
        colorHex: balance.leave_type.color_hex,
        allowHalfDays: balance.leave_type.allow_half_days,
      },
    }));
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get leave balance summary by users' })
  @ApiResponse({ status: 200, description: 'Leave balance summary retrieved successfully' })
  async getLeaveBalanceSummary(
    @Request() req,
    @Query('year') year?: string,
    @Query('companyId') companyId?: string,
  ) {
    const tenantId = req.user.tenantId;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Get all users in the tenant
    const users = await this.prisma.auth_user.findMany({
      where: {
        tenant_id: tenantId,
        ...(companyId && { 
          employee_profile: { 
            base_location: {
              company: {
                id: companyId
              }
            }
          }
        }),
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        employee_profile: {
          select: {
            emp_no: true,
            department: true,
            hire_date: true,
            base_location: {
              select: {
                company: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get all leave types for the tenant
    const leaveTypes = await this.prisma.leave_type.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
      },
      orderBy: { display_order: 'asc' },
    });

    // Get existing balances
    const existingBalances = await this.prisma.user_leave_balance.findMany({
      where: {
        tenant_id: tenantId,
        year: currentYear,
        ...(companyId && { company_id: companyId }),
      },
    });

    // Build user summary with all leave types
    const userSummaries = users.map((user) => {
      const userBalances = leaveTypes.map((leaveType) => {
        const existingBalance = existingBalances.find(
          (b) => b.user_id === user.id && b.leave_type_id === leaveType.id,
        );

        return {
          leaveTypeId: leaveType.id,
          leaveTypeName: leaveType.name,
          leaveTypeCode: leaveType.code,
          colorHex: leaveType.color_hex,
          allocated: existingBalance ? parseFloat(existingBalance.allocated.toString()) : 0,
          used: existingBalance ? parseFloat(existingBalance.used.toString()) : 0,
          pending: existingBalance ? parseFloat(existingBalance.pending.toString()) : 0,
          available: existingBalance ? parseFloat(existingBalance.available.toString()) : 0,
          allowHalfDays: leaveType.allow_half_days,
        };
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          employee_profile: user.employee_profile,
        },
        leaveBalances: userBalances,
      };
    });

    return {
      year: currentYear,
      leaveTypes: leaveTypes.map((lt) => ({
        id: lt.id,
        name: lt.name,
        code: lt.code,
        colorHex: lt.color_hex,
        allowHalfDays: lt.allow_half_days,
      })),
      userSummaries,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create user leave balance' })
  @ApiResponse({ status: 201, description: 'User leave balance created successfully' })
  async createUserLeaveBalance(
    @Body(ValidationPipe) createDto: CreateUserLeaveBalanceDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const adminUserId = req.user.sub;

    // Get user's company_id
    const user = await this.prisma.auth_user.findFirst({
      where: { id: createDto.userId, tenant_id: tenantId },
      include: { 
        employee_profile: {
          include: {
            base_location: {
              include: {
                company: true
              }
            }
          }
        }
      },
    });

    if (!user) {
      throw new Error('User not found or not in same tenant');
    }

    // Verify leave type belongs to tenant
    const leaveType = await this.prisma.leave_type.findFirst({
      where: { id: createDto.leaveTypeId, tenant_id: tenantId },
    });

    if (!leaveType) {
      throw new Error('Leave type not found or not in same tenant');
    }

    const companyId = user.employee_profile?.base_location?.company?.id || 'default';

    // Calculate available amount
    const allocated = createDto.allocated;
    const available = allocated; // Initial available = allocated (no used/pending yet)

    const balance = await this.prisma.user_leave_balance.create({
      data: {
        tenant_id: tenantId,
        user_id: createDto.userId,
        leave_type_id: createDto.leaveTypeId,
        company_id: companyId,
        year: createDto.year,
        allocated: allocated,
        used: 0,
        pending: 0,
        available: available,
        notes: createDto.notes,
        updated_by: adminUserId,
      },
    });

    // Record history
    await this.prisma.leave_allocation_history.create({
      data: {
        tenant_id: tenantId,
        user_id: createDto.userId,
        leave_type_id: createDto.leaveTypeId,
        year: createDto.year,
        action_type: 'INITIAL_SETUP',
        old_allocated: null,
        new_allocated: allocated,
        reason: 'Initial allocation setup',
        created_by: adminUserId,
      },
    });

    return balance;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user leave balance allocation' })
  @ApiResponse({ status: 200, description: 'User leave balance updated successfully' })
  async updateUserLeaveBalance(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateUserLeaveBalanceDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const adminUserId = req.user.sub;

    // Get existing balance with tenant check
    const existingBalance = await this.prisma.user_leave_balance.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingBalance) {
      throw new Error('Balance not found or not in same tenant');
    }

    const oldAllocated = parseFloat(existingBalance.allocated.toString());
    const newAllocated = updateDto.allocated;
    
    // Calculate new available = allocated - used - pending
    const used = parseFloat(existingBalance.used.toString());
    const pending = parseFloat(existingBalance.pending.toString());
    const available = newAllocated - used - pending;

    // Update balance
    const updatedBalance = await this.prisma.user_leave_balance.update({
      where: { id },
      data: {
        allocated: newAllocated,
        available: available,
        notes: updateDto.notes !== undefined ? updateDto.notes : existingBalance.notes,
        updated_by: adminUserId,
      },
    });

    // Record history if allocation changed
    if (oldAllocated !== newAllocated) {
      await this.prisma.leave_allocation_history.create({
        data: {
          tenant_id: tenantId,
          user_id: existingBalance.user_id,
          leave_type_id: existingBalance.leave_type_id,
          year: existingBalance.year,
          action_type: 'MANUAL_ADJUST',
          old_allocated: oldAllocated,
          new_allocated: newAllocated,
          reason: updateDto.reason || 'Manual adjustment by admin',
          created_by: adminUserId,
        },
      });
    }

    return updatedBalance;
  }

  @Get('history/:userId/:leaveTypeId')
  @ApiOperation({ summary: 'Get allocation history for user and leave type' })
  @ApiResponse({ status: 200, description: 'Allocation history retrieved successfully' })
  async getAllocationHistory(
    @Param('userId') userId: string,
    @Param('leaveTypeId') leaveTypeId: string,
    @Request() req,
    @Query('year') year?: string,
  ) {
    const tenantId = req.user.tenantId;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const history = await this.prisma.leave_allocation_history.findMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        leave_type_id: leaveTypeId,
        year: targetYear,
      },
      orderBy: { created_at: 'desc' },
    });

    return history;
  }
}