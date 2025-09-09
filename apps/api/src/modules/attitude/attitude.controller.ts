import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Param,
  Query,
  Body, 
  UseInterceptors, 
  UploadedFile, 
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AttitudeService } from './attitude.service';
import { 
  SubmitScreenshotDto,
  SubmitActivityDataDto,
  GetAttitudeStatsDto,
  GetProductivityAnalyticsDto,
  UpdateScreenshotStatusDto,
  GetScreenshotGalleryDto,
  LiveMonitoringDto
} from './dto/attitude.dto';

@ApiTags('Attitude Monitoring')
@Controller('attitude')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttitudeController {
  constructor(private readonly attitudeService: AttitudeService) {}

  @Post('screenshots/upload')
  @UseInterceptors(FileInterceptor('screenshot', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload screenshot' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Screenshot uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or data' })
  async uploadScreenshot(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmitScreenshotDto,
  ) {
    if (!file) {
      throw new BadRequestException('Screenshot file is required');
    }

    return this.attitudeService.submitScreenshot(
      req.user.id,
      req.user.companyId,
      file,
      dto,
    );
  }

  @Post('activity')
  @ApiOperation({ summary: 'Submit activity data' })
  @ApiResponse({ status: 201, description: 'Activity data submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid activity data' })
  async submitActivityData(
    @Request() req: any,
    @Body() dto: SubmitActivityDataDto,
  ) {
    return this.attitudeService.submitActivityData(
      req.user.id,
      req.user.companyId,
      dto,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get attitude statistics' })
  @ApiResponse({ status: 200, description: 'Attitude statistics retrieved successfully' })
  async getAttitudeStats(
    @Request() req: any,
    @Query() dto: GetAttitudeStatsDto,
  ) {
    return this.attitudeService.getAttitudeStats(
      req.user.id,
      req.user.companyId,
      dto,
      ['CUSTOMER_ADMIN', 'HR_MANAGER'].includes(req.user.role),
    );
  }

  @Get('screenshots')
  @ApiOperation({ summary: 'Get user screenshots' })
  @ApiResponse({ status: 200, description: 'Screenshots retrieved successfully' })
  async getUserScreenshots(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attitudeService.getUserScreenshots(
      req.user.id,
      req.user.companyId,
      startDate,
      endDate,
    );
  }

  // Admin-only endpoints
  @Get('analytics/productivity')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get productivity analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Productivity analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getProductivityAnalytics(
    @Request() req: any,
    @Query() dto: GetProductivityAnalyticsDto,
  ) {
    return this.attitudeService.getProductivityAnalytics(
      req.user.companyId,
      dto,
      true,
    );
  }

  @Get('screenshots/gallery')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get screenshot gallery (Admin only)' })
  @ApiResponse({ status: 200, description: 'Screenshot gallery retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getScreenshotGallery(
    @Request() req: any,
    @Query() dto: GetScreenshotGalleryDto,
  ) {
    return this.attitudeService.getScreenshotGallery(
      req.user.companyId,
      dto,
      true,
    );
  }

  @Put('screenshots/:id/blur')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update screenshot blur status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Screenshot blur status updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateScreenshotBlurStatus(
    @Request() req: any,
    @Body() body: { isBlurred: boolean },
    @Param('id') screenshotId: string,
  ) {
    return this.attitudeService.updateScreenshotBlurStatus(
      req.user.companyId,
      screenshotId,
      body.isBlurred,
      true,
    );
  }

  @Get('monitoring/live')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get live monitoring data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Live monitoring data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getLiveMonitoringData(
    @Request() req: any,
    @Query() dto: LiveMonitoringDto,
  ) {
    return this.attitudeService.getLiveMonitoringData(
      req.user.companyId,
      dto,
      true,
    );
  }

  @Get('reports/weekly')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get weekly attitude report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Weekly report retrieved successfully' })
  async getWeeklyReport(@Request() req: any) {
    return this.attitudeService.getProductivityAnalytics(
      req.user.companyId,
      { period: 'week' as any },
      true,
    );
  }

  @Get('reports/monthly')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get monthly attitude report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Monthly report retrieved successfully' })
  async getMonthlyReport(@Request() req: any) {
    return this.attitudeService.getProductivityAnalytics(
      req.user.companyId,
      { period: 'month' as any },
      true,
    );
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get attitude dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved successfully' })
  async getDashboardSummary(@Request() req: any) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

    return this.attitudeService.getAttitudeStats(
      req.user.id,
      req.user.companyId,
      {
        startDate: startOfToday.toISOString(),
        endDate: endOfToday.toISOString(),
      },
      ['CUSTOMER_ADMIN', 'HR_MANAGER'].includes(req.user.role),
    );
  }

  // New endpoints for enhanced desktop agent features
  @Post('processes')
  @ApiOperation({ summary: 'Submit process information' })
  @ApiResponse({ status: 201, description: 'Process data submitted successfully' })
  async submitProcessData(
    @Request() req: any,
    @Body() data: {
      processes: any[];
      systemStats: any;
      collectedAt: string;
      collectionType: 'automatic' | 'manual' | 'idle-triggered';
    },
  ) {
    return this.attitudeService.submitProcessData(
      req.user.id,
      req.user.companyId,
      data,
    );
  }

  @Post('network')
  @ApiOperation({ summary: 'Submit network information' })
  @ApiResponse({ status: 201, description: 'Network data submitted successfully' })
  async submitNetworkData(
    @Request() req: any,
    @Body() data: {
      networkInfo: any;
      location: 'OFFICE' | 'REMOTE' | 'UNKNOWN';
      collectedAt: string;
    },
  ) {
    return this.attitudeService.submitNetworkData(
      req.user.id,
      req.user.companyId,
      data,
    );
  }

  @Post('idle-events')
  @ApiOperation({ summary: 'Submit idle event' })
  @ApiResponse({ status: 201, description: 'Idle event submitted successfully' })
  async submitIdleEvent(
    @Request() req: any,
    @Body() data: {
      event: any;
      sessionId?: string;
    },
  ) {
    return this.attitudeService.submitIdleEvent(
      req.user.id,
      req.user.companyId,
      data,
    );
  }

  @Post('idle-sessions')
  @ApiOperation({ summary: 'Submit idle session data' })
  @ApiResponse({ status: 201, description: 'Idle session submitted successfully' })
  async submitIdleSession(
    @Request() req: any,
    @Body() data: {
      action: 'start' | 'end';
      session: any;
    },
  ) {
    return this.attitudeService.submitIdleSession(
      req.user.id,
      req.user.companyId,
      data,
    );
  }

  @Get('idle-stats')
  @ApiOperation({ summary: 'Get idle statistics' })
  @ApiResponse({ status: 200, description: 'Idle statistics retrieved successfully' })
  async getIdleStats(
    @Request() req: any,
    @Query('days') days?: number,
  ) {
    return this.attitudeService.getIdleStats(
      req.user.id,
      req.user.companyId,
      days || 7,
    );
  }

  // Admin endpoints for new features
  @Get('admin/processes')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get process usage analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Process analytics retrieved successfully' })
  async getProcessAnalytics(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attitudeService.getProcessAnalytics(
      req.user.companyId,
      userId,
      startDate,
      endDate,
    );
  }

  @Get('admin/network-usage')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get network usage analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Network analytics retrieved successfully' })
  async getNetworkAnalytics(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attitudeService.getNetworkAnalytics(
      req.user.companyId,
      userId,
      startDate,
      endDate,
    );
  }

  @Get('admin/sessions')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get user sessions for monitoring (Admin only)' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getAdminSessions(
    @Request() req: any,
    @Query('dateFilter') dateFilter?: 'today' | 'week' | 'month',
    @Query('limit') limit?: number,
  ) {
    return this.attitudeService.getAdminSessions(
      req.user.companyId,
      dateFilter || 'today',
      limit || 100,
    );
  }
}