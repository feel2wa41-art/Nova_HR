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
import { DailyReportService } from './daily-report.service';
import { ProgramCategoryService } from './program-category.service';
import {
  CreateDailyReportDto,
  UpdateDailyReportDto,
  CreateDailyReportEntryDto,
  ReviewReportDto,
  GetReportsQueryDto,
  GetTeamReportsQueryDto
} from './dto/daily-report.dto';
import {
  CreateProgramCategoryDto,
  UpdateProgramCategoryDto,
  CreateProgramMappingDto
} from './dto/program-category.dto';

@ApiTags('Daily Reports')
@Controller('daily-reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class DailyReportController {
  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly programCategoryService: ProgramCategoryService
  ) {}

  // ====================================
  // DAILY REPORT ENDPOINTS
  // ====================================

  @Post()
  @ApiOperation({ summary: 'Create a new daily report' })
  @ApiResponse({ status: 201, description: 'Daily report created successfully' })
  async createReport(@Request() req, @Body() createReportDto: CreateDailyReportDto) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.createReport(userId, createReportDto, tenantId);
  }

  @Get('my-reports')
  @ApiOperation({ summary: 'Get current user daily reports' })
  @ApiResponse({ status: 200, description: 'List of user daily reports' })
  async getMyReports(@Request() req, @Query() query: GetReportsQueryDto) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.getUserReports(
      userId,
      query.page,
      query.limit,
      query.status,
      tenantId
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get daily report by ID' })
  @ApiResponse({ status: 200, description: 'Daily report details' })
  async getReportById(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.getReportById(userId, id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update daily report' })
  @ApiResponse({ status: 200, description: 'Daily report updated successfully' })
  async updateReport(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReportDto: UpdateDailyReportDto
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.updateReport(userId, id, updateReportDto, tenantId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit daily report for review' })
  @ApiResponse({ status: 200, description: 'Daily report submitted successfully' })
  async submitReport(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.submitReport(userId, id, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete daily report' })
  @ApiResponse({ status: 200, description: 'Daily report deleted successfully' })
  async deleteReport(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.deleteReport(userId, id, tenantId);
  }

  // ====================================
  // REPORT ENTRY ENDPOINTS
  // ====================================

  @Post(':id/entries')
  @ApiOperation({ summary: 'Add entry to daily report' })
  @ApiResponse({ status: 201, description: 'Report entry added successfully' })
  async addEntry(
    @Request() req,
    @Param('id') id: string,
    @Body() createEntryDto: CreateDailyReportEntryDto
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.addEntry(userId, id, createEntryDto, tenantId);
  }

  @Put(':id/entries/:entryId')
  @ApiOperation({ summary: 'Update report entry' })
  @ApiResponse({ status: 200, description: 'Report entry updated successfully' })
  async updateEntry(
    @Request() req,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() updateEntryDto: Partial<CreateDailyReportEntryDto>
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.updateEntry(userId, id, entryId, updateEntryDto, tenantId);
  }

  @Delete(':id/entries/:entryId')
  @ApiOperation({ summary: 'Delete report entry' })
  @ApiResponse({ status: 200, description: 'Report entry deleted successfully' })
  async deleteEntry(
    @Request() req,
    @Param('id') id: string,
    @Param('entryId') entryId: string
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.deleteEntry(userId, id, entryId, tenantId);
  }

  // ====================================
  // TEAM/MANAGER ENDPOINTS
  // ====================================

  @Get('team/reports')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Get team daily reports (Manager/Admin only)' })
  @ApiResponse({ status: 200, description: 'List of team daily reports' })
  async getTeamReports(@Request() req, @Query() query: GetTeamReportsQueryDto) {
    const managerId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.getTeamReports(managerId, tenantId, query.page, query.limit, {
      status: query.status,
      userId: query.userId,
      startDate: query.startDate,
      endDate: query.endDate
    });
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: 'Review daily report (Manager/Admin only)' })
  @ApiResponse({ status: 200, description: 'Daily report reviewed successfully' })
  async reviewReport(
    @Request() req,
    @Param('id') id: string,
    @Body() reviewDto: ReviewReportDto
  ) {
    const reviewerId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.dailyReportService.reviewReport(reviewerId, id, reviewDto.status, tenantId);
  }

  // ====================================
  // PROGRAM CATEGORY ENDPOINTS
  // ====================================

  @Get('categories/all')
  @ApiOperation({ summary: 'Get all program categories' })
  @ApiResponse({ status: 200, description: 'List of program categories' })
  async getCategories(@Request() req, @Query('includeInactive') includeInactive?: boolean) {
    // Get company_id from user's tenant or org_unit
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.getCategories(user.companyId, includeInactive);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Create program category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Program category created successfully' })
  async createCategory(@Request() req, @Body() createCategoryDto: CreateProgramCategoryDto) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.createCategory(user.companyId, createCategoryDto);
  }

  @Put('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Update program category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Program category updated successfully' })
  async updateCategory(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateProgramCategoryDto
  ) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.updateCategory(user.companyId, id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Delete program category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Program category deleted successfully' })
  async deleteCategory(@Request() req, @Param('id') id: string) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.deleteCategory(user.companyId, id);
  }

  @Post('categories/:id/programs')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Add program mapping to category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Program mapping added successfully' })
  async addProgramMapping(
    @Request() req,
    @Param('id') id: string,
    @Body() createMappingDto: CreateProgramMappingDto
  ) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.addProgramMapping(user.companyId, id, createMappingDto);
  }

  @Delete('categories/:id/programs/:mappingId')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Remove program mapping from category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Program mapping removed successfully' })
  async removeProgramMapping(
    @Request() req,
    @Param('id') id: string,
    @Param('mappingId') mappingId: string
  ) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.removeProgramMapping(user.companyId, id, mappingId);
  }

  @Get('categories/mappings/all')
  @ApiOperation({ summary: 'Get all program mappings' })
  @ApiResponse({ status: 200, description: 'List of all program mappings' })
  async getAllProgramMappings(@Request() req) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.getAllProgramMappings(user.companyId);
  }

  @Post('categories/setup-defaults')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Create default program categories (Admin only)' })
  @ApiResponse({ status: 201, description: 'Default categories created successfully' })
  async createDefaultCategories(@Request() req) {
    const user = await this.getCompanyIdFromUser(req.user.id);
    return this.programCategoryService.createDefaultCategories(user.companyId);
  }

  // Helper method to get company ID from user
  private async getCompanyIdFromUser(userId: string): Promise<{ companyId: string }> {
    // This is a simplified implementation - you may need to adjust based on your auth structure
    // For now, we'll get the company ID from the user's tenant or org_unit relation
    const { PrismaService } = require('../../shared/services/prisma.service');
    const prisma = new PrismaService();
    
    const user = await prisma.auth_user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          include: {
            companies: true
          }
        },
        org_unit: {
          include: {
            company: true
          }
        }
      }
    });

    if (user?.org_unit?.company) {
      return { companyId: user.org_unit.company.id };
    }

    if (user?.tenant?.companies?.[0]) {
      return { companyId: user.tenant.companies[0].id };
    }

    throw new Error('Unable to determine company ID for user');
  }
}