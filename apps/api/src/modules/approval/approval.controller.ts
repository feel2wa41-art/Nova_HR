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
import { ApprovalService } from './approval.service';
import {
  CreateApprovalCategoryDto,
  UpdateApprovalCategoryDto,
  CreateApprovalDraftDto,
  UpdateApprovalDraftDto,
  ProcessApprovalDto,
  ApprovalQueryDto,
  ApprovalStatisticsQueryDto,
  BulkApprovalImportDto
} from './dto/approval.dto';
// Removed UserRole import - using string role checks instead

@ApiTags('Approval')
@Controller('approval')
@UseGuards(EnhancedJwtAuthGuard)
@ApiBearerAuth('access-token')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  // Category Management
  @Post('categories')
  @ApiOperation({ summary: 'Create approval category (HR Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @Body(ValidationPipe) createDto: CreateApprovalCategoryDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.tenantId;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can create approval categories');
    }

    return this.approvalService.createCategory(createDto, companyId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get approval categories' })
  @ApiQuery({ name: 'includeInactive', required: false, type: 'boolean' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories(
    @Query('includeInactive') includeInactive: boolean = false,
    @Request() req
  ) {
    const companyId = req.user.tenantId;
    return this.approvalService.getCategories(companyId, includeInactive);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get approval category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  async getCategory(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.approvalService.getCategory(id, tenantId);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update approval category (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateApprovalCategoryDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.tenantId;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can update approval categories');
    }

    return this.approvalService.updateCategory(id, updateDto, companyId);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete approval category (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(@Param('id') id: string, @Request() req) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.tenantId;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can delete approval categories');
    }

    return this.approvalService.deleteCategory(id, companyId);
  }

  // Draft Management - COUNT ENDPOINTS FIRST
  @Get('drafts/count')
  @ApiOperation({ summary: 'Get draft count for current user' })
  @ApiResponse({ status: 200, description: 'Draft count retrieved successfully' })
  async getDraftsCount(@Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getCount('drafts', userId, userRole);
  }

  @Post('drafts')
  @ApiOperation({ summary: 'Create approval draft' })
  @ApiResponse({ status: 201, description: 'Draft created successfully' })
  async createDraft(
    @Body(ValidationPipe) createDto: CreateApprovalDraftDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.approvalService.createDraft(createDto, userId, tenantId);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'Get approval drafts' })
  @ApiResponse({ status: 200, description: 'Drafts retrieved successfully' })
  async getDrafts(
    @Query() queryDto: ApprovalQueryDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getDrafts(queryDto, userId, tenantId, userRole);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get approval draft by ID' })
  @ApiResponse({ status: 200, description: 'Draft retrieved successfully' })
  async getDraft(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.approvalService.getDraft(id, userId, tenantId);
  }

  @Put('drafts/:id')
  @ApiOperation({ summary: 'Update approval draft (draft status only)' })
  @ApiResponse({ status: 200, description: 'Draft updated successfully' })
  async updateDraft(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateApprovalDraftDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.approvalService.updateDraft(id, updateDto, userId, tenantId);
  }

  @Post('drafts/:id/submit')
  @ApiOperation({ summary: 'Submit draft for approval' })
  @ApiResponse({ status: 200, description: 'Draft submitted successfully' })
  async submitDraft(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.approvalService.submitDraft(id, userId, tenantId);
  }

  @Post('drafts/:id/process')
  @ApiOperation({ summary: 'Process approval (approve/reject/return/forward)' })
  @ApiResponse({ status: 200, description: 'Approval processed successfully' })
  async processApproval(
    @Param('id') id: string,
    @Body(ValidationPipe) processDto: ProcessApprovalDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.approvalService.processApproval(id, processDto, userId, tenantId);
  }

  @Delete('drafts/:id')
  @ApiOperation({ summary: 'Delete approval draft (draft status only)' })
  @ApiResponse({ status: 200, description: 'Draft deleted successfully' })
  async deleteDraft(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.approvalService.deleteDraft(id, userId);
  }

  // Statistics and Reports
  @Get('statistics')
  @ApiOperation({ summary: 'Get approval statistics (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Query() queryDto: ApprovalStatisticsQueryDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.tenantId;

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can view approval statistics');
    }

    return this.approvalService.getApprovalStatistics(queryDto, companyId);
  }

  // Views for different user contexts - COUNT ENDPOINTS FIRST
  @Get('inbox/count')
  @ApiOperation({ summary: 'Get inbox count for current user' })
  @ApiResponse({ status: 200, description: 'Inbox count retrieved successfully' })
  async getInboxCount(@Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getCount('inbox', userId, userRole);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({ status: 200, description: 'Inbox items retrieved successfully' })
  async getInbox(@Query() queryDto: ApprovalQueryDto, @Request() req) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    const userRole = req.user.roles?.[0];
    const inboxQuery = { ...queryDto, view: 'inbox' as const };
    return this.approvalService.getDrafts(inboxQuery, userId, tenantId, userRole);
  }

  @Get('outbox/count')
  @ApiOperation({ summary: 'Get outbox count for current user' })
  @ApiResponse({ status: 200, description: 'Outbox count retrieved successfully' })
  async getOutboxCount(@Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getCount('outbox', userId, userRole);
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Get user submitted requests' })
  @ApiResponse({ status: 200, description: 'Outbox items retrieved successfully' })
  async getOutbox(@Query() queryDto: ApprovalQueryDto, @Request() req) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    const userRole = req.user.roles?.[0];
    const outboxQuery = { ...queryDto, view: 'outbox' as const };
    return this.approvalService.getDrafts(outboxQuery, userId, tenantId, userRole);
  }

  @Get('pending/count')
  @ApiOperation({ summary: 'Get pending approval count for current user' })
  @ApiResponse({ status: 200, description: 'Pending count retrieved successfully' })
  async getPendingCount(@Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getCount('pending', userId, userRole);
  }

  @Get('reference/count')
  @ApiOperation({ summary: 'Get reference document count for current user' })
  @ApiResponse({ status: 200, description: 'Reference count retrieved successfully' })
  async getReferenceCount(@Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getCount('reference', userId, userRole);
  }

  @Get('my-drafts')
  @ApiOperation({ summary: 'Get user draft documents' })
  @ApiResponse({ status: 200, description: 'Draft documents retrieved successfully' })
  async getMyDrafts(@Query() queryDto: ApprovalQueryDto, @Request() req) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    const userRole = req.user.roles?.[0];
    const draftsQuery = { ...queryDto, view: 'drafts' as const };
    return this.approvalService.getDrafts(draftsQuery, userId, tenantId, userRole);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import approval records (Admin only)' })
  @ApiResponse({ status: 201, description: 'Approval records imported successfully' })
  async bulkImportApprovals(
    @Body(ValidationPipe) importDto: BulkApprovalImportDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];

    if (userRole !== 'HR_ADMIN') {
      throw new ForbiddenException('Only HR admins can import approval records');
    }

    // Implementation for bulk import would go here
    // This is a placeholder for the actual implementation
    return {
      message: 'Bulk import functionality will be implemented',
      records: importDto.records.length
    };
  }

}