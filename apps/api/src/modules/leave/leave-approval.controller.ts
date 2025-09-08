import {
  Controller,
  Post,
  Get,
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

    // Get the leave approval category
    const leaveCategory = await this.prisma.approval_category.findFirst({
      where: { code: 'LEAVE_REQUEST' }
    });

    if (!leaveCategory) {
      throw new Error('Leave request category not found. Please contact administrator.');
    }

    // Get leave type to get the code
    const leaveType = await this.prisma.leave_type.findUnique({
      where: { id: createDto.leaveTypeId }
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
    }, userId);

    // Submit the draft automatically
    await this.approvalService.submitDraft(approvalDraft.id, userId);

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
  async getLeaveTypes() {
    const leaveTypes = await this.prisma.leave_type.findMany({
      where: { is_active: true },
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

    return leaveTypes;
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

    // Transform to expected format
    const result = balances.reduce((acc, balance) => {
      acc[balance.leave_type.toLowerCase()] = {
        allocated: Number(balance.allocated),
        used: Number(balance.used),
        pending: Number(balance.pending),
        remaining: Number(balance.allocated) - Number(balance.used) - Number(balance.pending)
      };
      return acc;
    }, {} as any);

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
}