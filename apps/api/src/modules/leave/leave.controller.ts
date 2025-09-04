import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnhancedJwtAuthGuard } from '../../auth/guards/enhanced-jwt.guard';
import { LeaveService } from './leave.service';
import {
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveBalanceQueryDto,
  BulkLeaveImportDto,
  LeaveSettingsDto,
  LeaveStatus
} from './dto/leave.dto';
// UserRole removed - using string role checks

@ApiTags('Leave')
@Controller('leave')
@UseGuards(EnhancedJwtAuthGuard)
@ApiBearerAuth('access-token')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Create a new leave request' })
  @ApiResponse({ 
    status: 201, 
    description: 'Leave request created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        leave_type: { type: 'string' },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        requested_days: { type: 'number' },
        status: { type: 'string', enum: ['PENDING', 'APPROVED'] },
        reason: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  })
  async createLeaveRequest(
    @Body(ValidationPipe) createDto: CreateLeaveRequestDto, 
    @Request() req
  ) {
    const userId = req.user.sub;
    return this.leaveService.createLeaveRequest(userId, createDto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get leave requests' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              leave_type: { type: 'string' },
              start_date: { type: 'string', format: 'date' },
              end_date: { type: 'string', format: 'date' },
              requested_days: { type: 'number' },
              approved_days: { type: 'number' },
              status: { type: 'string' },
              reason: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  employee_profile: {
                    type: 'object',
                    properties: {
                      department: { type: 'string' },
                      emp_no: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async getLeaveRequests(
    @Query() queryDto: LeaveRequestQueryDto, 
    @Request() req
  ) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.leaveService.getLeaveRequests(queryDto, userId, userRole);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get a specific leave request' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        leave_type: { type: 'string' },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
        requested_days: { type: 'number' },
        approved_days: { type: 'number' },
        status: { type: 'string' },
        reason: { type: 'string' },
        approval_notes: { type: 'string' },
        rejection_reason: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' }
          }
        },
        approved_by_user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' }
          }
        }
      }
    }
  })
  async getLeaveRequest(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.leaveService.getLeaveRequest(id, userId, userRole);
  }

  @Put('requests/:id')
  @ApiOperation({ summary: 'Update a leave request (only pending requests)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request updated successfully'
  })
  async updateLeaveRequest(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateLeaveRequestDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    return this.leaveService.updateLeaveRequest(id, userId, updateDto);
  }

  @Put('requests/:id/approve')
  @ApiOperation({ summary: 'Approve a leave request (HR Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request approved successfully'
  })
  async approveLeaveRequest(
    @Param('id') id: string,
    @Body(ValidationPipe) approveDto: ApproveLeaveRequestDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const adminId = req.user.sub;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can approve leave requests');
    }

    return this.leaveService.approveLeaveRequest(id, adminId, approveDto);
  }

  @Put('requests/:id/reject')
  @ApiOperation({ summary: 'Reject a leave request (HR Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request rejected successfully'
  })
  async rejectLeaveRequest(
    @Param('id') id: string,
    @Body(ValidationPipe) rejectDto: RejectLeaveRequestDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const adminId = req.user.sub;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can reject leave requests');
    }

    return this.leaveService.rejectLeaveRequest(id, adminId, rejectDto);
  }

  @Put('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a leave request' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave request cancelled successfully'
  })
  async cancelLeaveRequest(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.leaveService.cancelLeaveRequest(id, userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get leave balance for user' })
  @ApiQuery({ name: 'year', required: false, description: 'Year for balance calculation' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID (admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        annual: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            used: { type: 'number' },
            available: { type: 'number' }
          }
        },
        sick: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            used: { type: 'number' },
            available: { type: 'number' }
          }
        },
        personal: {
          type: 'object',
          properties: {
            used: { type: 'number' }
          }
        }
      }
    }
  })
  async getLeaveBalance(@Query() queryDto: LeaveBalanceQueryDto, @Request() req) {
    const currentUserId = req.user.sub;
    const userRole = req.user.roles?.[0];

    // Check permission for accessing other user's balance
    if (queryDto.user_id && queryDto.user_id !== currentUserId && userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Cannot access other users leave balance');
    }

    const userId = queryDto.user_id || currentUserId;
    return this.leaveService.getLeaveBalance(userId, queryDto.year);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get leave statistics (Admin only)' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            approved: { type: 'number' },
            pending: { type: 'number' },
            rejected: { type: 'number' },
            approvalRate: { type: 'string' }
          }
        },
        byType: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              count: { type: 'number' },
              totalDays: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getLeaveStatistics(@Query('period') period: string, @Request() req) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.companyId;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can view leave statistics');
    }

    return this.leaveService.getLeaveStatistics(companyId, period);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get leave calendar data' })
  @ApiQuery({ name: 'month', required: false, description: 'Month in YYYY-MM format' })
  @ApiQuery({ name: 'team', required: false, description: 'Filter by team/department' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave calendar data retrieved successfully'
  })
  async getLeaveCalendar(
    @Query('month') month: string,
    @Query('team') team: string,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.companyId;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can view leave calendar');
    }

    // Parse month parameter
    let startDate: Date, endDate: Date;
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0); // Last day of the month
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const queryDto: LeaveRequestQueryDto = {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: LeaveStatus.APPROVED,
      page: 1,
      limit: 1000 // Get all approved leave for the month
    };

    const result = await this.leaveService.getLeaveRequests(queryDto, req.user.sub, userRole);
    
    // Transform data for calendar display
    const calendarData = result.data.map(leave => ({
      id: leave.id,
      title: `${leave.user.name} - ${leave.leave_type}`,
      start: leave.start_date,
      end: leave.end_date,
      type: leave.leave_type,
      employee: leave.user.name,
      department: leave.user.employee_profile?.department,
      days: leave.approved_days
    }));

    return {
      events: calendarData,
      month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`
    };
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'Get pending leave approvals (HR Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pending leave approvals retrieved successfully'
  })
  async getPendingApprovals(@Request() req) {
    const userRole = req.user.roles?.[0];

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can view pending approvals');
    }

    const queryDto: LeaveRequestQueryDto = {
      status: LeaveStatus.PENDING,
      page: 1,
      limit: 100
    };

    return this.leaveService.getLeaveRequests(queryDto, req.user.sub, userRole);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import leave records (Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Leave records imported successfully'
  })
  async bulkImportLeave(
    @Body(ValidationPipe) importDto: BulkLeaveImportDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can import leave records');
    }

    // Implementation for bulk import would go here
    // This is a placeholder for the actual implementation
    return {
      message: 'Bulk import functionality will be implemented',
      records: importDto.records.length
    };
  }
}