import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnhancedJwtAuthGuard } from '../../auth/guards/enhanced-jwt.guard';
import { ApprovalService } from '../approval/approval.service';
import { PrismaService } from '../../shared/services/prisma.service';

interface CreateLeaveApprovalDto {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  emergency?: boolean;
  duration?: string;
  workingDays?: number;
  approvalSettings?: any;
}

@ApiTags('Leave Approval')
@Controller('leave-approval')
@UseGuards(EnhancedJwtAuthGuard)
@ApiBearerAuth('access-token')
export class LeaveApprovalController {
  constructor(
    private readonly approvalService: ApprovalService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit leave request through approval system' })
  @ApiResponse({ status: 201, description: 'Leave request submitted successfully' })
  async submitLeaveRequest(
    @Body(ValidationPipe) createDto: CreateLeaveApprovalDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;

    // Get the leave approval category with company filtering
    const leaveCategory = await this.prisma.approval_category.findFirst({
      where: { 
        code: 'LEAVE_REQUEST',
        OR: [
          { company_id: tenantId },  // Company-specific category
          { company_id: null }       // Global/system category
        ]
      }
    });

    if (!leaveCategory) {
      throw new Error('Leave request category not found. Please contact administrator.');
    }

    // Get leave type with company filtering
    const leaveType = await this.prisma.leave_type.findFirst({
      where: { 
        id: createDto.leaveTypeId,
        OR: [
          { company_id: tenantId },  // Company-specific leave type
          { company_id: null }       // Global/system leave type
        ]
      }
    });

    if (!leaveType) {
      throw new Error('Invalid leave type selected.');
    }

    // Calculate working days
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    
    // For now, use total days as working days (can be enhanced with business day calculation)
    const workingDays = createDto.workingDays || totalDays;
    const duration = createDto.duration || (totalDays === 1 ? 'FULL_DAY' : 'MULTI_DAY');

    // Create comprehensive form data for approval draft
    const formData = {
      leave_type_id: createDto.leaveTypeId,
      leave_type_code: leaveType.code,
      leave_type_name: leaveType.name,
      start_date: createDto.startDate,
      end_date: createDto.endDate,
      total_days: totalDays,
      working_days: workingDays,
      duration: duration,
      reason: createDto.reason || '',
      emergency: createDto.emergency || false,
      approval_settings: createDto.approvalSettings || null,
      submitted_at: new Date().toISOString()
    };

    // Create approval draft with comprehensive leave data
    const approvalDraft = await this.approvalService.createDraft({
      category_id: leaveCategory.id,
      title: `휴가 신청 - ${leaveType.name} (${createDto.startDate} ~ ${createDto.endDate})`,
      form_data: formData
    }, userId, tenantId);

    // Submit the draft automatically
    await this.approvalService.submitDraft(approvalDraft.id, userId, tenantId);

    // Create automatic approval route for leave request
    await this.createLeaveApprovalRoute(approvalDraft.id, userId, tenantId, createDto.emergency || false);

    // Also create a leave_request record for tracking
    await this.prisma.leave_request.create({
      data: {
        user_id: userId,
        leave_type_id: leaveType.id,
        start_date: startDate,
        end_date: endDate,
        days_count: workingDays, // Use working days for leave balance calculation
        reason: createDto.reason || '',
        duration: duration,
        emergency: createDto.emergency || false,
        status: 'PENDING',
        approval_draft_id: approvalDraft.id,
        submitted_at: new Date()
      }
    });

    return {
      success: true,
      message: '휴가 신청이 승인 대기열에 추가되었습니다.',
      approvalId: approvalDraft.id,
      data: {
        leaveType: leaveType.name,
        period: `${createDto.startDate} ~ ${createDto.endDate}`,
        workingDays: workingDays,
        emergency: createDto.emergency || false
      }
    };
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available leave types' })
  @ApiResponse({ status: 200, description: 'Leave types retrieved successfully' })
  async getLeaveTypes(@Request() req) {
    const companyId = req.user.tenantId;
    
    const leaveTypes = await this.prisma.leave_type.findMany({
      where: { 
        is_active: true,
        OR: [
          { company_id: companyId }, // Company-specific leave types
          { company_id: null }       // System-wide leave types
        ]
      },
      select: {
        id: true,
        name: true,
        code: true,
        color_hex: true,
        max_days_year: true,
        is_paid: true,
        requires_approval: true
      },
      orderBy: { name: 'asc' }
    });

    // Transform to match frontend interface expectations
    return leaveTypes.map(type => ({
      id: type.id,
      name: type.name,
      code: type.code,
      colorHex: type.color_hex,
      maxDaysYear: type.max_days_year,
      isPaid: type.is_paid,
      requiresApproval: type.requires_approval
    }));
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get leave balance for current user' })
  @ApiResponse({ status: 200, description: 'Leave balance retrieved successfully' })
  async getLeaveBalance(@Request() req) {
    const userId = req.user.sub;
    const currentYear = new Date().getFullYear();

    const balances = await this.prisma.leave_balance.findMany({
      where: {
        user_id: userId,
        year: currentYear
      }
    });

    // Get leave types for name mapping
    const leaveTypes = await this.prisma.leave_type.findMany({
      where: {
        OR: [
          { company_id: req.user.tenantId },
          { company_id: null }
        ]
      }
    });

    const leaveTypeMap = leaveTypes.reduce((acc, type) => {
      acc[type.code] = type.name;
      return acc;
    }, {} as any);

    // Transform to expected format - return array instead of object
    const result = balances.map(balance => ({
      leaveType: balance.leave_type.toUpperCase(),
      leaveTypeName: leaveTypeMap[balance.leave_type.toUpperCase()] || balance.leave_type,
      allocated: Number(balance.allocated),
      used: Number(balance.used),
      pending: Number(balance.pending),
      remaining: Number(balance.allocated) - Number(balance.used) - Number(balance.pending)
    }));

    return result;
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get user leave requests' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  async getLeaveRequests(@Request() req) {
    const userId = req.user.sub;

    // Get leave requests with approval status
    const requests = await this.prisma.leave_request.findMany({
      where: { user_id: userId },
      include: {
        leave_type: true,
        approval_draft: true
      },
      orderBy: { created_at: 'desc' }
    });

    return requests.map(request => ({
      id: request.id,
      leaveTypeId: request.leave_type_id,
      leaveTypeName: request.leave_type.name,
      startDate: request.start_date.toISOString().split('T')[0],
      endDate: request.end_date.toISOString().split('T')[0],
      daysCount: Number(request.days_count),
      reason: request.reason,
      emergency: request.emergency || false,
      status: request.status,
      decidedBy: request.decided_by,
      decidedAt: request.decided_at?.toISOString(),
      comments: request.comments,
      createdAt: request.created_at.toISOString(),
      approvalStatus: request.approval_draft?.status
    }));
  }

  private async createLeaveApprovalRoute(draftId: string, requesterId: string, companyId: string, emergency: boolean) {
    try {
      // Get the requester's organization info to find their manager
      const requester = await this.prisma.auth_user.findUnique({
        where: { id: requesterId },
        include: {
          org_unit: {
            include: {
              parent: {
                include: {
                  members: {
                    where: {
                      role: { in: ['MANAGER', 'HR_MANAGER'] }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Find HR managers in the company as fallback approvers
      const hrManagers = await this.prisma.auth_user.findMany({
        where: {
          tenant_id: companyId,
          role: { in: ['HR_MANAGER', 'HR_ADMIN'] }
        }
      });

      if (!hrManagers.length) {
        throw new Error('No HR managers found in the company for approval routing.');
      }

      // Create approval route
      const route = await this.prisma.approval_route.create({
        data: {
          draft_id: draftId
        }
      });

      // Create approval stages based on emergency status
      if (emergency) {
        // For emergency leave: Direct HR approval
        const hrStage = await this.prisma.approval_route_stage.create({
          data: {
            route_id: route.id,
            type: 'APPROVAL',
            mode: 'SEQUENTIAL',
            order_index: 1,
            name: 'HR 긴급 승인',
            status: 'PENDING'
          }
        });

        // Add HR manager as approver
        await this.prisma.approval_route_approver.create({
          data: {
            stage_id: hrStage.id,
            user_id: hrManagers[0].id,
            order_index: 1,
            status: 'PENDING'
          }
        });
      } else {
        // Regular leave: Manager approval -> HR approval
        let stageOrder = 1;
        
        // Stage 1: Direct Manager Approval (if manager exists)
        const manager = requester?.org_unit?.parent?.members?.find(
          member => ['MANAGER', 'HR_MANAGER'].includes(member.role) && member.id !== requesterId
        );

        if (manager) {
          const managerStage = await this.prisma.approval_route_stage.create({
            data: {
              route_id: route.id,
              type: 'APPROVAL',
              mode: 'SEQUENTIAL',
              order_index: stageOrder++,
              name: '직속상관 승인',
              status: 'PENDING'
            }
          });

          await this.prisma.approval_route_approver.create({
            data: {
              stage_id: managerStage.id,
              user_id: manager.id,
              order_index: 1,
              status: 'PENDING'
            }
          });
        }

        // Stage 2: HR Approval
        const hrStage = await this.prisma.approval_route_stage.create({
          data: {
            route_id: route.id,
            type: 'APPROVAL',
            mode: 'SEQUENTIAL',
            order_index: stageOrder,
            name: 'HR 최종 승인',
            status: manager ? 'PENDING' : 'PENDING'
          }
        });

        await this.prisma.approval_route_approver.create({
          data: {
            stage_id: hrStage.id,
            user_id: hrManagers[0].id,
            order_index: 1,
            status: 'PENDING'
          }
        });
      }

      console.log(`Created approval route for leave request ${draftId} with ${emergency ? 'emergency' : 'regular'} workflow`);
      
    } catch (error) {
      console.error('Failed to create leave approval route:', error);
      throw error;
    }
  }
}