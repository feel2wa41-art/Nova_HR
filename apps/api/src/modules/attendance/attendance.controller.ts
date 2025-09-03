import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query,
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  @ApiOperation({ summary: 'Get today attendance record' })
  async getTodayAttendance(@Request() req: any) {
    return this.attendanceService.getTodayAttendance(req.user.userId);
  }

  @Get('records')
  @ApiOperation({ summary: 'Get attendance records' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAttendanceRecords(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.attendanceService.getAttendanceRecords(req.user.userId, startDate, endDate);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get attendance statistics' })
  @ApiQuery({ name: 'month', required: false })
  async getAttendanceStats(
    @Request() req: any,
    @Query('month') month?: string
  ) {
    return this.attendanceService.getAttendanceStats(req.user.userId, month);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get attendance requests' })
  async getAttendanceRequests(@Request() req: any) {
    return this.attendanceService.getAttendanceRequests(req.user.userId);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Check in to work' })
  async checkIn(
    @Request() req: any,
    @Body() body: {
      latitude: number;
      longitude: number;
      location_id?: string;
      note?: string;
      face_image?: string;
    }
  ) {
    return this.attendanceService.checkIn(req.user.userId, body);
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Check out from work' })
  async checkOut(
    @Request() req: any,
    @Body() body: {
      latitude: number;
      longitude: number;
      location_id?: string;
      note?: string;
    }
  ) {
    return this.attendanceService.checkOut(req.user.userId, body);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create attendance correction request' })
  async createAttendanceRequest(
    @Request() req: any,
    @Body() body: {
      date: string;
      type: 'CHECK_IN' | 'CHECK_OUT' | 'ADJUST';
      requested_time: string;
      reason: string;
      supporting_documents?: string[];
    }
  ) {
    return this.attendanceService.createAttendanceRequest(req.user.userId, body);
  }
}