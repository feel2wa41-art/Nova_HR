import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(@Request() req: any, @Query('limit') limit?: string) {
    return this.notificationService.getNotifications(req.user.id, limit ? parseInt(limit) : 50);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post()
  @ApiOperation({ summary: 'Create notification (admin only)' })
  async createNotification(
    @Body() body: { 
      user_id: string; 
      title: string; 
      message: string; 
      type?: string; 
      metadata?: any 
    }
  ) {
    return this.notificationService.createNotification(body);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.deleteNotification(id, req.user.id);
  }

  // Enhanced endpoints
  @Get('by-type/:type')
  @ApiOperation({ summary: 'Get notifications by type' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotificationsByType(
    @Request() req: any,
    @Param('type') type: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getNotificationsByType(
      req.user.id,
      type,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved successfully' })
  async getNotificationSettings(@Request() req: any) {
    return this.notificationService.getNotificationSettings(req.user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully' })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() settings: {
      email_enabled?: boolean;
      push_enabled?: boolean;
      attendance_reminders?: boolean;
      approval_notifications?: boolean;
      system_announcements?: boolean;
      productivity_reports?: boolean;
    },
  ) {
    return this.notificationService.updateNotificationSettings(req.user.id, settings);
  }

  // Admin endpoints
  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Create bulk notifications (Admin only)' })
  @ApiResponse({ status: 201, description: 'Bulk notifications created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createBulkNotification(
    @Request() req: any,
    @Body() data: {
      userIds: string[];
      title: string;
      message: string;
      type?: string;
      metadata?: any;
    },
  ) {
    return this.notificationService.createBulkNotification(data);
  }

  @Post('company')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Create company-wide notification (Admin only)' })
  @ApiResponse({ status: 201, description: 'Company notification created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createCompanyNotification(
    @Request() req: any,
    @Body() data: {
      title: string;
      message: string;
      type?: string;
      metadata?: any;
      roles?: string[];
      departments?: string[];
    },
  ) {
    return this.notificationService.createCompanyNotification(req.user.companyId, data);
  }

  @Post('announcement')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Send system announcement (Admin only)' })
  @ApiResponse({ status: 201, description: 'System announcement sent successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async sendSystemAnnouncement(
    @Request() req: any,
    @Body() data: {
      title: string;
      message: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expiresAt?: Date;
    },
  ) {
    return this.notificationService.sendSystemAnnouncement(req.user.companyId, data);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Get notification statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getNotificationStats(@Request() req: any) {
    return this.notificationService.getSystemNotificationStats(
      req.user.role === 'admin' ? undefined : req.user.companyId,
    );
  }

  @Post('admin/cleanup')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cleanup old notifications (Global Admin only)' })
  @ApiResponse({ status: 200, description: 'Old notifications cleaned up successfully' })
  @ApiResponse({ status: 403, description: 'Global admin access required' })
  async cleanupOldNotifications(@Query('daysOld') daysOld?: string) {
    return this.notificationService.cleanupOldNotifications(
      daysOld ? parseInt(daysOld) : 30,
    );
  }

  // Test endpoints for development
  @Post('test/attendance-reminder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Send test attendance reminder (Admin only)' })
  @ApiResponse({ status: 201, description: 'Test reminder sent successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async sendTestAttendanceReminder(
    @Request() req: any,
    @Body() data: { userId: string; type: 'check_in' | 'check_out' },
  ) {
    return this.notificationService.sendAttendanceReminder(data.userId, data.type);
  }

  @Post('test/productivity-report')
  @UseGuards(RolesGuard)
  @Roles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Send test productivity report (Admin only)' })
  @ApiResponse({ status: 201, description: 'Test report sent successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async sendTestProductivityReport(
    @Request() req: any,
    @Body() data: {
      userId: string;
      period: string;
      score: number;
      activeTime: number;
    },
  ) {
    return this.notificationService.sendProductivityReport(data.userId, data);
  }
}