import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Param, 
  Body, 
  Query,
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Approval')
@Controller('approval')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get approval categories' })
  async getCategories() {
    return this.approvalService.getCategories();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get approval statistics for current user' })
  async getStatistics(@Request() req: any) {
    return this.approvalService.getStatistics(req.user.userId);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'Get drafts' })
  @ApiQuery({ name: 'type', required: false, enum: ['my', 'inbox', 'outbox'] })
  async getDrafts(
    @Request() req: any,
    @Query('type') type?: 'my' | 'inbox' | 'outbox'
  ) {
    return this.approvalService.getDrafts(req.user.userId, type);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get draft by ID' })
  async getDraft(@Request() req: any, @Param('id') id: string) {
    return this.approvalService.getDraft(req.user.userId, id);
  }

  @Post('drafts')
  @ApiOperation({ summary: 'Create new draft' })
  async createDraft(
    @Request() req: any,
    @Body() body: {
      title: string;
      category_id: string;
      content: any;
      attachments?: string[];
    }
  ) {
    return this.approvalService.createDraft(req.user.userId, body);
  }

  @Post('drafts/:id/submit')
  @ApiOperation({ summary: 'Submit draft for approval' })
  async submitDraft(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      approvers: Array<{ user_id: string; step: number; type: 'APPROVE' | 'REVIEW' }>;
      reviewers?: Array<{ user_id: string; step: number }>;
      references?: Array<{ user_id: string }>;
    }
  ) {
    return this.approvalService.submitDraft(req.user.userId, id, body);
  }

  @Patch('drafts/:id/process')
  @ApiOperation({ summary: 'Process approval (approve/reject)' })
  async processApproval(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      action: 'APPROVE' | 'REJECT';
      comment?: string;
    }
  ) {
    return this.approvalService.processApproval(req.user.userId, id, body.action, body.comment);
  }
}