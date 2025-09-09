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
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { OvertimeService } from './overtime.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import {
  CreateOvertimeRequestDto,
  UpdateOvertimeRequestDto,
  ApproveOvertimeRequestDto,
  RejectOvertimeRequestDto,
  UploadOvertimeAttachmentDto,
  CreateOvertimePolicyDto,
  UpdateOvertimePolicyDto,
  GetOvertimeRequestsDto,
} from './dto/overtime.dto';

@ApiTags('Overtime Management')
@ApiBearerAuth()
@Controller('overtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  // ================================
  // Overtime Request Management
  // ================================

  @Post('requests')
  @ApiOperation({ summary: '추가근무 신청 생성' })
  async createOvertimeRequest(
    @Body() dto: CreateOvertimeRequestDto,
    @Request() req
  ) {
    // TODO: Extract company ID from user context or token
    const companyId = 'company-demo'; // Temporary
    return await this.overtimeService.createOvertimeRequest(req.user.id, companyId, dto);
  }

  @Get('requests')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: '추가근무 신청 목록 조회 (관리자)' })
  async getOvertimeRequests(
    @Query() query: GetOvertimeRequestsDto,
    @Request() req
  ) {
    const companyId = 'company-demo'; // TODO: Extract from context
    return await this.overtimeService.getOvertimeRequests(companyId, query);
  }

  @Get('my-requests')
  @ApiOperation({ summary: '내 추가근무 신청 목록 조회' })
  async getMyOvertimeRequests(
    @Query() query: GetOvertimeRequestsDto,
    @Request() req
  ) {
    return await this.overtimeService.getUserOvertimeRequests(req.user.id, query);
  }

  @Get('requests/:requestId')
  @ApiOperation({ summary: '추가근무 신청 상세 조회' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async getOvertimeRequestById(
    @Param('requestId') requestId: string,
    @Request() req
  ) {
    return await this.overtimeService.getOvertimeRequestById(requestId, req.user.id);
  }

  @Put('requests/:requestId')
  @ApiOperation({ summary: '추가근무 신청 수정' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async updateOvertimeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: UpdateOvertimeRequestDto,
    @Request() req
  ) {
    return await this.overtimeService.updateOvertimeRequest(requestId, req.user.id, dto);
  }

  @Delete('requests/:requestId')
  @ApiOperation({ summary: '추가근무 신청 삭제' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async deleteOvertimeRequest(
    @Param('requestId') requestId: string,
    @Request() req
  ) {
    return await this.overtimeService.deleteOvertimeRequest(requestId, req.user.id);
  }

  // ================================
  // Approval Management
  // ================================

  @Post('requests/:requestId/approve')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: '추가근무 신청 승인' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async approveOvertimeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ApproveOvertimeRequestDto,
    @Request() req
  ) {
    return await this.overtimeService.approveOvertimeRequest(requestId, req.user.id, dto);
  }

  @Post('requests/:requestId/reject')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: '추가근무 신청 거절' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async rejectOvertimeRequest(
    @Param('requestId') requestId: string,
    @Body() dto: RejectOvertimeRequestDto,
    @Request() req
  ) {
    return await this.overtimeService.rejectOvertimeRequest(requestId, req.user.id, dto);
  }

  // ================================
  // File Attachment Management
  // ================================

  @Post('requests/:requestId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '추가근무 신청 첨부파일 업로드' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async uploadAttachment(
    @Param('requestId') requestId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }

    // TODO: 실제 파일 저장 로직 구현 (S3, MinIO 등)
    const attachmentDto: UploadOvertimeAttachmentDto = {
      file_name: file.originalname,
      file_path: `/uploads/overtime/${requestId}/${file.filename}`, // 실제 저장 경로
      file_size: file.size,
      file_type: file.mimetype
    };

    return await this.overtimeService.uploadAttachment(requestId, req.user.id, attachmentDto);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: '추가근무 신청 첨부파일 삭제' })
  @ApiParam({ name: 'attachmentId', description: '첨부파일 ID' })
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Request() req
  ) {
    return await this.overtimeService.deleteAttachment(attachmentId, req.user.id);
  }

  // ================================
  // Policy Management
  // ================================

  @Post('company/:companyId/policies')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '추가근무 정책 생성' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async createOvertimePolicy(
    @Param('companyId') companyId: string,
    @Body() dto: CreateOvertimePolicyDto
  ) {
    return await this.overtimeService.createOvertimePolicy(companyId, dto);
  }

  @Get('company/:companyId/policies')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER')
  @ApiOperation({ summary: '추가근무 정책 목록 조회' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async getOvertimePolicies(@Param('companyId') companyId: string) {
    return await this.overtimeService.getOvertimePolicies(companyId);
  }

  @Put('policies/:policyId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '추가근무 정책 수정' })
  @ApiParam({ name: 'policyId', description: '정책 ID' })
  async updateOvertimePolicy(
    @Param('policyId') policyId: string,
    @Body() dto: UpdateOvertimePolicyDto
  ) {
    return await this.overtimeService.updateOvertimePolicy(policyId, dto);
  }

  @Delete('policies/:policyId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '추가근무 정책 삭제' })
  @ApiParam({ name: 'policyId', description: '정책 ID' })
  async deleteOvertimePolicy(@Param('policyId') policyId: string) {
    return await this.overtimeService.deleteOvertimePolicy(policyId);
  }

  // ================================
  // Statistics and Reports
  // ================================

  @Get('company/:companyId/statistics')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '추가근무 통계 조회' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '시작 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '종료 날짜 (YYYY-MM-DD)' })
  async getOvertimeStatistics(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return await this.overtimeService.getOvertimeStatistics(companyId, startDate, endDate);
  }

  // ================================
  // Integration with Approval System
  // ================================

  @Post('requests/:requestId/create-approval')
  @ApiOperation({ summary: '추가근무 신청을 전자결재로 전환' })
  @ApiParam({ name: 'requestId', description: '추가근무 신청 ID' })
  async createApprovalDraft(
    @Param('requestId') requestId: string,
    @Body() body: { category_id: string; approval_route?: any },
    @Request() req
  ) {
    // TODO: 전자결재 시스템과 연동
    // 1. 추가근무 신청 정보 조회
    const overtimeRequest = await this.overtimeService.getOvertimeRequestById(requestId, req.user.id);
    
    // 2. 전자결재 문서 데이터 구성
    const approvalData = {
      user_id: req.user.id,
      category_id: body.category_id,
      title: `${overtimeRequest.title} - 추가근무 신청`,
      description: overtimeRequest.work_description,
      content: {
        overtime_request_id: requestId,
        overtime_type: overtimeRequest.overtime_type,
        work_date: overtimeRequest.work_date,
        start_time: overtimeRequest.start_time,
        end_time: overtimeRequest.end_time,
        total_hours: overtimeRequest.total_hours,
        reason: overtimeRequest.reason,
        attachments: overtimeRequest.attachments
      }
    };

    // 3. 전자결재 문서 생성 로직 호출
    // return await this.approvalService.createDraft(approvalData);
    
    return {
      message: '전자결재 문서 생성 기능은 추후 구현 예정입니다.',
      approval_data: approvalData
    };
  }
}