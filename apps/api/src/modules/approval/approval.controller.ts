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
import { UserRole } from '@prisma/client';

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
    const companyId = req.user.companyId;

    if (userRole !== UserRole.HR_ADMIN) {
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
    const companyId = req.user.companyId;
    return this.approvalService.getCategories(companyId, includeInactive);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get approval category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  async getCategory(@Param('id') id: string) {
    return this.approvalService.getCategory(id);
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
    const companyId = req.user.companyId;

    if (userRole !== UserRole.HR_ADMIN) {
      throw new ForbiddenException('Only HR admins can update approval categories');
    }

    return this.approvalService.updateCategory(id, updateDto, companyId);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete approval category (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(@Param('id') id: string, @Request() req) {
    const userRole = req.user.roles?.[0];
    const companyId = req.user.companyId;

    if (userRole !== UserRole.HR_ADMIN) {
      throw new ForbiddenException('Only HR admins can delete approval categories');
    }

    return this.approvalService.deleteCategory(id, companyId);
  }

  // Draft Management
  @Post('drafts')
  @ApiOperation({ summary: 'Create approval draft' })
  @ApiResponse({ status: 201, description: 'Draft created successfully' })
  async createDraft(
    @Body(ValidationPipe) createDto: CreateApprovalDraftDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    return this.approvalService.createDraft(createDto, userId);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'Get approval drafts' })
  @ApiResponse({ status: 200, description: 'Drafts retrieved successfully' })
  async getDrafts(
    @Query() queryDto: ApprovalQueryDto,
    @Request() req
  ) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    return this.approvalService.getDrafts(queryDto, userId, userRole);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get approval draft by ID' })
  @ApiResponse({ status: 200, description: 'Draft retrieved successfully' })
  async getDraft(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.approvalService.getDraft(id, userId);
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
    return this.approvalService.updateDraft(id, updateDto, userId);
  }

  @Post('drafts/:id/submit')
  @ApiOperation({ summary: 'Submit draft for approval' })
  @ApiResponse({ status: 200, description: 'Draft submitted successfully' })
  async submitDraft(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.approvalService.submitDraft(id, userId);
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
    return this.approvalService.processApproval(id, processDto, userId);
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
    const companyId = req.user.companyId;

    if (userRole !== UserRole.HR_ADMIN) {
      throw new ForbiddenException('Only HR admins can view approval statistics');
    }

    return this.approvalService.getApprovalStatistics(queryDto, companyId);
  }

  // Views for different user contexts
  @Get('inbox')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({ status: 200, description: 'Inbox items retrieved successfully' })
  async getInbox(@Query() queryDto: ApprovalQueryDto, @Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    const inboxQuery = { ...queryDto, view: 'inbox' as const };
    return this.approvalService.getDrafts(inboxQuery, userId, userRole);
  }

  @Get('outbox')
  @ApiOperation({ summary: 'Get user submitted requests' })
  @ApiResponse({ status: 200, description: 'Outbox items retrieved successfully' })
  async getOutbox(@Query() queryDto: ApprovalQueryDto, @Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    const outboxQuery = { ...queryDto, view: 'outbox' as const };
    return this.approvalService.getDrafts(outboxQuery, userId, userRole);
  }

  @Get('my-drafts')
  @ApiOperation({ summary: 'Get user draft documents' })
  @ApiResponse({ status: 200, description: 'Draft documents retrieved successfully' })
  async getMyDrafts(@Query() queryDto: ApprovalQueryDto, @Request() req) {
    const userId = req.user.sub;
    const userRole = req.user.roles?.[0];
    const draftsQuery = { ...queryDto, view: 'drafts' as const };
    return this.approvalService.getDrafts(draftsQuery, userId, userRole);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import approval records (Admin only)' })
  @ApiResponse({ status: 201, description: 'Approval records imported successfully' })
  async bulkImportApprovals(
    @Body(ValidationPipe) importDto: BulkApprovalImportDto,
    @Request() req
  ) {
    const userRole = req.user.roles?.[0];

    if (userRole !== UserRole.HR_ADMIN) {
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