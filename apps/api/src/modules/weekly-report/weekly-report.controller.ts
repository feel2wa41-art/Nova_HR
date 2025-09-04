import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { WeeklyReportService } from './weekly-report.service';
import {
  CreateWeeklyReportDto,
  UpdateWeeklyReportDto,
  CreateWeeklyReportEntryDto,
  GenerateWeeklyReportDto,
  ReviewWeeklyReportDto,
  GetWeeklyReportsQueryDto,
  GetTeamWeeklyReportsQueryDto
} from './dto/weekly-report.dto';

@ApiTags('Weekly Reports')
@Controller('weekly-reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class WeeklyReportController {
  constructor(private readonly weeklyReportService: WeeklyReportService) {}

  // ====================================
  // WEEKLY REPORT ENDPOINTS
  // ====================================

  @Post()
  @ApiOperation({ summary: 'Create a new weekly report manually' })
  @ApiResponse({ status: 201, description: 'Weekly report created successfully' })
  async createReport(@Request() req, @Body() createReportDto: CreateWeeklyReportDto) {
    return this.weeklyReportService.createReport(req.user.id, createReportDto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate weekly report from daily reports' })
  @ApiResponse({ status: 201, description: 'Weekly report generated successfully' })
  async generateFromDailyReports(@Request() req, @Body() generateDto: GenerateWeeklyReportDto) {
    return this.weeklyReportService.generateFromDailyReports(req.user.id, generateDto.week_start);
  }

  @Get('daily-reports-check')
  @ApiOperation({ summary: 'Check if daily reports are available for a week' })
  @ApiResponse({ status: 200, description: 'Daily reports availability check' })
  async checkDailyReportsAvailable(
    @Request() req, 
    @Query('week_start') weekStart: string
  ) {
    return this.weeklyReportService.checkDailyReportsAvailable(req.user.id, weekStart);
  }

  @Get('my-reports')
  @ApiOperation({ summary: 'Get current user weekly reports' })
  @ApiResponse({ status: 200, description: 'List of user weekly reports' })
  async getMyReports(@Request() req, @Query() query: GetWeeklyReportsQueryDto) {
    return this.weeklyReportService.getUserReports(
      req.user.id,
      query.page,
      query.limit,
      query.status
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get weekly report by ID' })
  @ApiResponse({ status: 200, description: 'Weekly report details' })
  async getReportById(@Request() req, @Param('id') id: string) {
    return this.weeklyReportService.getReportById(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update weekly report' })
  @ApiResponse({ status: 200, description: 'Weekly report updated successfully' })
  async updateReport(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReportDto: UpdateWeeklyReportDto
  ) {
    return this.weeklyReportService.updateReport(req.user.id, id, updateReportDto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit weekly report for review' })
  @ApiResponse({ status: 200, description: 'Weekly report submitted successfully' })
  async submitReport(@Request() req, @Param('id') id: string) {
    return this.weeklyReportService.submitReport(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete weekly report' })
  @ApiResponse({ status: 200, description: 'Weekly report deleted successfully' })
  async deleteReport(@Request() req, @Param('id') id: string) {
    return this.weeklyReportService.deleteReport(req.user.id, id);
  }

  // ====================================
  // REPORT ENTRY ENDPOINTS
  // ====================================

  @Post(':id/entries')
  @ApiOperation({ summary: 'Add entry to weekly report' })
  @ApiResponse({ status: 201, description: 'Report entry added successfully' })
  async addEntry(
    @Request() req,
    @Param('id') id: string,
    @Body() createEntryDto: CreateWeeklyReportEntryDto
  ) {
    return this.weeklyReportService.addEntry(req.user.id, id, createEntryDto);
  }

  @Put(':id/entries/:entryId')
  @ApiOperation({ summary: 'Update report entry' })
  @ApiResponse({ status: 200, description: 'Report entry updated successfully' })
  async updateEntry(
    @Request() req,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() updateEntryDto: Partial<CreateWeeklyReportEntryDto>
  ) {
    return this.weeklyReportService.updateEntry(req.user.id, id, entryId, updateEntryDto);
  }

  @Delete(':id/entries/:entryId')
  @ApiOperation({ summary: 'Delete report entry' })
  @ApiResponse({ status: 200, description: 'Report entry deleted successfully' })
  async deleteEntry(
    @Request() req,
    @Param('id') id: string,
    @Param('entryId') entryId: string
  ) {
    return this.weeklyReportService.deleteEntry(req.user.id, id, entryId);
  }

  // ====================================
  // TEAM/MANAGER ENDPOINTS
  // ====================================

  @Get('team/reports')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Get team weekly reports (Manager/Admin only)' })
  @ApiResponse({ status: 200, description: 'List of team weekly reports' })
  async getTeamReports(@Request() req, @Query() query: GetTeamWeeklyReportsQueryDto) {
    return this.weeklyReportService.getTeamReports(req.user.id, query.page, query.limit, {
      status: query.status,
      userId: query.userId,
      startDate: query.startDate,
      endDate: query.endDate
    });
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Review weekly report (Manager/Admin only)' })
  @ApiResponse({ status: 200, description: 'Weekly report reviewed successfully' })
  async reviewReport(
    @Request() req,
    @Param('id') id: string,
    @Body() reviewDto: ReviewWeeklyReportDto
  ) {
    return this.weeklyReportService.reviewReport(req.user.id, id, reviewDto.status);
  }
}