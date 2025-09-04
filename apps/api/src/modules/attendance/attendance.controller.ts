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
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  CheckOutDto,
  AttendanceHistoryDto,
  AttendanceAdjustmentDto,
  AdminAttendanceUpdateDto,
  BulkAttendanceImportDto,
} from './dto/attendance.dto';
// UserRole removed - using string role checks

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(EnhancedJwtAuthGuard)
@ApiBearerAuth('access-token')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Employee check-in' })
  @ApiResponse({ 
    status: 200, 
    description: 'Check-in successful',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        check_in_at: { type: 'string', format: 'date-time' },
        check_in_location: { type: 'object' },
        status: { type: 'string', enum: ['PRESENT', 'LATE', 'REMOTE', 'OFFSITE'] },
        is_remote: { type: 'boolean' },
        requires_approval: { type: 'boolean' },
        reason_code: { type: 'string' },
        reason_text: { type: 'string' }
      }
    }
  })
  async checkIn(@Body(ValidationPipe) checkInDto: CheckInDto, @Request() req) {
    const userId = req.user.sub;
    return this.attendanceService.checkIn(userId, checkInDto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Employee check-out' })
  @ApiResponse({ 
    status: 200, 
    description: 'Check-out successful',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        check_out_at: { type: 'string', format: 'date-time' },
        check_out_location: { type: 'object' },
        work_hours: { type: 'number' },
        break_hours: { type: 'number' },
        overtime_hours: { type: 'number' },
        status: { type: 'string', enum: ['PRESENT', 'EARLY_LEAVE'] }
      }
    }
  })
  async checkOut(@Body(ValidationPipe) checkOutDto: CheckOutDto, @Request() req) {
    const userId = req.user.sub;
    return this.attendanceService.checkOut(userId, checkOutDto);
  }

  @Get('current-status')
  @ApiOperation({ summary: 'Get current attendance status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current attendance status',
    schema: {
      type: 'object',
      properties: {
        isCheckedIn: { type: 'boolean' },
        todayAttendance: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            check_in_at: { type: 'string', format: 'date-time' },
            check_out_at: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            work_hours: { type: 'number' }
          }
        },
        workingHours: {
          type: 'object',
          properties: {
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            break_duration_minutes: { type: 'number' }
          }
        }
      }
    }
  })
  async getCurrentStatus(@Request() req) {
    const userId = req.user.sub;
    return this.attendanceService.getCurrentAttendanceStatus(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get attendance history' })
  @ApiResponse({ 
    status: 200, 
    description: 'Attendance history retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              date: { type: 'string', format: 'date' },
              check_in_at: { type: 'string', format: 'date-time' },
              check_out_at: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
              work_hours: { type: 'number' },
              break_hours: { type: 'number' },
              overtime_hours: { type: 'number' }
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
  async getAttendanceHistory(
    @Query() historyDto: AttendanceHistoryDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    
    if (historyDto.userId && historyDto.userId !== userId && userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Cannot access other users attendance data');
    }
    
    return this.attendanceService.getAttendanceHistory(
      historyDto.userId || userId,
      historyDto
    );
  }

  @Post('adjustment-request')
  @ApiOperation({ summary: 'Request attendance adjustment' })
  @ApiResponse({ status: 201, description: 'Adjustment request created' })
  async createAdjustmentRequest(
    @Body(ValidationPipe) adjustmentDto: AttendanceAdjustmentDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    return this.attendanceService.createAdjustmentRequest(userId, adjustmentDto);
  }

  @Get('adjustment-requests')
  @ApiOperation({ summary: 'Get attendance adjustment requests' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiResponse({ status: 200, description: 'Adjustment requests retrieved' })
  async getAdjustmentRequests(@Query('status') status: string, @Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    
    if (userRole === 'HR_ADMIN') {
      return this.attendanceService.getAllAdjustmentRequests(status);
    } else {
      return this.attendanceService.getUserAdjustmentRequests(userId, status);
    }
  }

  @Put('adjustment-requests/:id/approve')
  @ApiOperation({ summary: 'Approve attendance adjustment request (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Adjustment request approved' })
  async approveAdjustmentRequest(@Param('id') id: string, @Request() req) {
    const userRole = req.user.roles?.[0];
    const adminId = req.user.sub;
    
    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can approve adjustment requests');
    }
    
    return this.attendanceService.approveAdjustmentRequest(id, adminId);
  }

  @Put('adjustment-requests/:id/reject')
  @ApiOperation({ summary: 'Reject attendance adjustment request (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Adjustment request rejected' })
  async rejectAdjustmentRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const adminId = req.user.sub;
    
    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can reject adjustment requests');
    }
    
    return this.attendanceService.rejectAdjustmentRequest(id, adminId, reason);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Attendance statistics' })
  async getAttendanceStatistics(
    @Query('period') period: string = 'month',
    @Query('userId') userId: string,
    @Request() req
  ) {
    const currentUserId = req.user.sub;
    const userRole = req.user.roles?.[0];
    
    if (userId && userId !== currentUserId && userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Cannot access other users statistics');
    }
    
    return this.attendanceService.getAttendanceStatistics(
      userId || currentUserId,
      period
    );
  }
}