import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { 
  CreateLeaveRequestDto, 
  UpdateLeaveRequestDto,
  LeaveRequestQueryDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveBalanceQueryDto,
  BulkLeaveImportDto,
  LeaveSettingsDto,
  LeaveType,
  LeaveStatus
} from './dto/leave.dto';
// UserRole removed - using string role checks

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async createLeaveRequest(userId: string, createDto: CreateLeaveRequestDto) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      include: {
        employee_profile: {
          include: {
            base_location: {
              include: { company: true }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate dates
    const startDate = new Date(createDto.start_date);
    const endDate = new Date(createDto.end_date);
    
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check advance notice requirement (simplified for now)
    const today = new Date();
    const advanceNoticeDays = 1; // Default 1 day notice
    const requiredNoticeDate = new Date(today.getTime() + (advanceNoticeDays * 24 * 60 * 60 * 1000));
    
    if (startDate < requiredNoticeDate && createDto.leave_type !== 'SICK') {
      throw new BadRequestException(`Leave requests must be submitted at least ${advanceNoticeDays} days in advance`);
    }

    // Calculate days
    const days = this.calculateLeaveDays(startDate, endDate, createDto.half_day_period);

    // Check leave balance - simplified for now
    // TODO: Implement proper leave balance checking
    // const currentBalance = await this.getLeaveBalance(userId, new Date().getFullYear());

    // Check for overlapping leave requests
    const overlapping = await this.prisma.leave_request.findFirst({
      where: {
        user_id: userId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        OR: [
          {
            AND: [
              { start_date: { lte: endDate } },
              { end_date: { gte: startDate } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      throw new BadRequestException('You have an overlapping leave request for this period');
    }

    // Get leave type
    const leaveType = await this.prisma.leave_type.findFirst({
      where: { code: createDto.leave_type }
    });
    
    if (!leaveType) {
      throw new BadRequestException(`Invalid leave type: ${createDto.leave_type}`);
    }

    // Create leave request
    const leaveRequest = await this.prisma.leave_request.create({
      data: {
        user_id: userId,
        leave_type_id: leaveType.id,
        start_date: startDate,
        end_date: endDate,
        days_count: days,
        reason: createDto.reason,
        duration: createDto.duration || 'FULL_DAY',
        emergency_contact: createDto.emergency_contact,
        status: leaveType.requires_approval ? 'PENDING' : 'APPROVED',
        submitted_at: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        leave_type: {
          select: {
            name: true,
            code: true,
            color_hex: true
          }
        }
      }
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'CREATE_LEAVE_REQUEST',
        entity_type: 'leave_request',
        entity_id: leaveRequest.id,
        changes: { created: createDto },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return leaveRequest;
  }

  async updateLeaveRequest(id: string, userId: string, updateDto: UpdateLeaveRequestDto) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.user_id !== userId) {
      throw new ForbiddenException('You can only update your own leave requests');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    // Validate dates if provided
    let days = leaveRequest.requested_days;
    if (updateDto.start_date || updateDto.end_date) {
      const startDate = new Date(updateDto.start_date || leaveRequest.start_date);
      const endDate = new Date(updateDto.end_date || leaveRequest.end_date);
      
      if (startDate > endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      days = this.calculateLeaveDays(startDate, endDate, updateDto.half_day_period);
    }

    const updatedRequest = await this.prisma.leave_request.update({
      where: { id },
      data: {
        ...updateDto,
        start_date: updateDto.start_date ? new Date(updateDto.start_date) : undefined,
        end_date: updateDto.end_date ? new Date(updateDto.end_date) : undefined,
        requested_days: days,
        updated_at: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        emergency_contact: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'UPDATE_LEAVE_REQUEST',
        entity_type: 'leave_request',
        entity_id: id,
        changes: { updated: updateDto },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return updatedRequest;
  }

  async getLeaveRequests(queryDto: LeaveRequestQueryDto, requestingUserId: string, userRole: string) {
    const where: any = {};

    // Non-admin users can only see their own requests
    if (userRole !== UserRole.HR_ADMIN) {
      where.user_id = requestingUserId;
    } else if (queryDto.user_id) {
      where.user_id = queryDto.user_id;
    }

    // Apply filters
    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.leave_type) {
      where.leave_type = queryDto.leave_type;
    }

    if (queryDto.start_date) {
      where.start_date = { gte: new Date(queryDto.start_date) };
    }

    if (queryDto.end_date) {
      where.end_date = { lte: new Date(queryDto.end_date) };
    }

    const [requests, total] = await Promise.all([
      this.prisma.leave_request.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              employee_profile: {
                select: {
                  department: true,
                  emp_no: true
                }
              }
            }
          },
          emergency_contact: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          approved_by_user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (queryDto.page - 1) * queryDto.limit,
        take: queryDto.limit
      }),
      this.prisma.leave_request.count({ where })
    ]);

    return {
      data: requests,
      pagination: {
        total,
        page: queryDto.page,
        limit: queryDto.limit,
        totalPages: Math.ceil(total / queryDto.limit)
      }
    };
  }

  async getLeaveRequest(id: string, requestingUserId: string, userRole: string) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            employee_profile: {
              select: {
                department: true,
                emp_no: true
              }
            }
          }
        },
        emergency_contact: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        approved_by_user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Non-admin users can only see their own requests
    if (userRole !== UserRole.HR_ADMIN && leaveRequest.user_id !== requestingUserId) {
      throw new ForbiddenException('You can only view your own leave requests');
    }

    return leaveRequest;
  }

  async approveLeaveRequest(id: string, approvedById: string, approveDto: ApproveLeaveRequestDto) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be approved');
    }

    const approvedRequest = await this.prisma.leave_request.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approved_by: approvedById,
        approved_at: new Date(),
        approval_notes: approveDto.approval_notes,
        approved_start_date: approveDto.approved_start_date ? new Date(approveDto.approved_start_date) : undefined,
        approved_end_date: approveDto.approved_end_date ? new Date(approveDto.approved_end_date) : undefined,
        approved_days: approveDto.approved_days || leaveRequest.requested_days,
        updated_at: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        approved_by_user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: approvedById,
        action: 'APPROVE_LEAVE_REQUEST',
        entity_type: 'leave_request',
        entity_id: id,
        changes: { approved: approveDto },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return approvedRequest;
  }

  async rejectLeaveRequest(id: string, rejectedById: string, rejectDto: RejectLeaveRequestDto) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be rejected');
    }

    const rejectedRequest = await this.prisma.leave_request.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        rejected_by: rejectedById,
        rejected_at: new Date(),
        rejection_reason: rejectDto.rejection_reason,
        rejection_notes: rejectDto.rejection_notes,
        updated_at: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        rejected_by_user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: rejectedById,
        action: 'REJECT_LEAVE_REQUEST',
        entity_type: 'leave_request',
        entity_id: id,
        changes: { rejected: rejectDto },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return rejectedRequest;
  }

  async cancelLeaveRequest(id: string, userId: string) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.user_id !== userId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (leaveRequest.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Leave request is already cancelled');
    }

    // Check if leave has already started
    const today = new Date();
    if (leaveRequest.start_date <= today) {
      throw new BadRequestException('Cannot cancel leave that has already started');
    }

    const cancelledRequest = await this.prisma.leave_request.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
        cancelled_at: new Date(),
        updated_at: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'CANCEL_LEAVE_REQUEST',
        entity_type: 'leave_request',
        entity_id: id,
        changes: { cancelled: true },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return cancelledRequest;
  }

  async getLeaveBalance(userId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    
    // Get user's leave settings
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: { leave_settings: true }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const leaveSettings = user.company?.leave_settings || {
      annual_leave_days: 21,
      sick_leave_days: 10,
      max_carry_over_days: 5
    };

    // Get approved leave requests for the year
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);

    const approvedLeave = await this.prisma.leave_request.findMany({
      where: {
        user_id: userId,
        status: LeaveStatus.APPROVED,
        start_date: { gte: startOfYear },
        end_date: { lte: endOfYear }
      }
    });

    // Calculate used days by leave type
    const usedDays = approvedLeave.reduce((acc, leave) => {
      const type = leave.leave_type.toLowerCase();
      acc[type] = (acc[type] || 0) + leave.approved_days;
      return acc;
    }, {});

    // Calculate available balance
    const balance = {
      annual: {
        total: leaveSettings.annual_leave_days,
        used: usedDays.annual || 0,
        available: leaveSettings.annual_leave_days - (usedDays.annual || 0)
      },
      sick: {
        total: leaveSettings.sick_leave_days,
        used: usedDays.sick || 0,
        available: leaveSettings.sick_leave_days - (usedDays.sick || 0)
      },
      personal: {
        used: usedDays.personal || 0
      },
      maternity: {
        used: usedDays.maternity || 0
      },
      paternity: {
        used: usedDays.paternity || 0
      },
      bereavement: {
        used: usedDays.bereavement || 0
      },
      unpaid: {
        used: usedDays.unpaid || 0
      }
    };

    return balance;
  }

  async getLeaveStatistics(companyId?: string, period?: string) {
    const periodFilter = this.getPeriodFilter(period);
    const whereClause: any = {
      created_at: periodFilter
    };

    if (companyId) {
      whereClause.user = {
        company_id: companyId
      };
    }

    const [totalRequests, approvedRequests, pendingRequests, rejectedRequests] = await Promise.all([
      this.prisma.leave_request.count({ where: whereClause }),
      this.prisma.leave_request.count({ 
        where: { ...whereClause, status: LeaveStatus.APPROVED } 
      }),
      this.prisma.leave_request.count({ 
        where: { ...whereClause, status: LeaveStatus.PENDING } 
      }),
      this.prisma.leave_request.count({ 
        where: { ...whereClause, status: LeaveStatus.REJECTED } 
      })
    ]);

    // Get leave requests by type
    const leaveByType = await this.prisma.leave_request.groupBy({
      by: ['leave_type'],
      where: whereClause,
      _count: { id: true },
      _sum: { approved_days: true }
    });

    return {
      summary: {
        total: totalRequests,
        approved: approvedRequests,
        pending: pendingRequests,
        rejected: rejectedRequests,
        approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests * 100).toFixed(1) : 0
      },
      byType: leaveByType.map(item => ({
        type: item.leave_type,
        count: item._count.id,
        totalDays: item._sum.approved_days || 0
      }))
    };
  }

  private calculateLeaveDays(startDate: Date, endDate: Date, halfDayPeriod?: string): number {
    if (halfDayPeriod) {
      return 0.5;
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Exclude weekends (basic implementation)
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  private getPeriodFilter(period?: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { gte: startDate };
  }
}