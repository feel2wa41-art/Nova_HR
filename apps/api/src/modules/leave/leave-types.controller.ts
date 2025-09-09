import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnhancedJwtAuthGuard } from '../../auth/guards/enhanced-jwt.guard';
import { PrismaService } from '../../shared/services/prisma.service';

interface CreateLeaveTypeDto {
  name: string;
  code: string;
  colorHex: string;
  maxDaysYear?: number;
  isPaid: boolean;
  requiresApproval: boolean;
  description?: string;
}

interface UpdateLeaveTypeDto {
  name?: string;
  code?: string;
  colorHex?: string;
  maxDaysYear?: number;
  isPaid?: boolean;
  requiresApproval?: boolean;
  description?: string;
}

@ApiTags('Leave Types Management')
@Controller('leave-types')
@UseGuards(EnhancedJwtAuthGuard)
@ApiBearerAuth('access-token')
export class LeaveTypesController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Helper method to check HR manager permissions
  private checkHRPermissions(user: any) {
    if (!['HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('HR 관리자 권한이 필요합니다.');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get leave types (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leave types retrieved successfully' })
  async getLeaveTypes(@Request() req) {
    this.checkHRPermissions(req.user);
    const tenantId = req.user.tenantId;
    
    const leaveTypes = await this.prisma.leave_type.findMany({
      where: { 
        OR: [
          { company_id: tenantId },  // Company-specific leave types
          { company_id: null }       // Global/system leave types
        ]
      },
      select: {
        id: true,
        name: true,
        code: true,
        color_hex: true,
        max_days_year: true,
        is_paid: true,
        requires_approval: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { name: 'asc' }
    });

    // Transform to match frontend interface expectations
    return leaveTypes.map(type => ({
      id: type.id,
      name: type.name,
      code: type.code,
      colorHex: type.color_hex,
      maxDaysYear: type.max_days_year,
      isPaid: type.is_paid,
      requiresApproval: type.requires_approval,
      isActive: type.is_active,
      createdAt: type.created_at,
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Create leave type (Admin only)' })
  @ApiResponse({ status: 201, description: 'Leave type created successfully' })
  async createLeaveType(
    @Body(ValidationPipe) createDto: CreateLeaveTypeDto,
    @Request() req
  ) {
    this.checkHRPermissions(req.user);
    const tenantId = req.user.tenantId;

    // Check if code already exists for this company
    const existingType = await this.prisma.leave_type.findFirst({
      where: {
        code: createDto.code,
        OR: [
          { company_id: tenantId },
          { company_id: null }
        ]
      }
    });

    if (existingType) {
      throw new Error('이미 존재하는 휴가 종류 코드입니다.');
    }

    const leaveType = await this.prisma.leave_type.create({
      data: {
        company_id: tenantId,
        name: createDto.name,
        code: createDto.code,
        color_hex: createDto.colorHex,
        max_days_year: createDto.maxDaysYear,
        is_paid: createDto.isPaid,
        requires_approval: createDto.requiresApproval,
        is_active: true,
      }
    });

    return {
      success: true,
      message: '휴가 종류가 생성되었습니다.',
      data: {
        id: leaveType.id,
        name: leaveType.name,
        code: leaveType.code,
        colorHex: leaveType.color_hex,
        maxDaysYear: leaveType.max_days_year,
        isPaid: leaveType.is_paid,
        requiresApproval: leaveType.requires_approval,
      }
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update leave type (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leave type updated successfully' })
  async updateLeaveType(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateLeaveTypeDto,
    @Request() req
  ) {
    this.checkHRPermissions(req.user);
    const tenantId = req.user.tenantId;

    // Check if leave type exists and belongs to the company
    const existingType = await this.prisma.leave_type.findFirst({
      where: {
        id: id,
        OR: [
          { company_id: tenantId },
          { company_id: null }
        ]
      }
    });

    if (!existingType) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    // If updating code, check for conflicts
    if (updateDto.code && updateDto.code !== existingType.code) {
      const codeExists = await this.prisma.leave_type.findFirst({
        where: {
          code: updateDto.code,
          id: { not: id },
          OR: [
            { company_id: tenantId },
            { company_id: null }
          ]
        }
      });

      if (codeExists) {
        throw new Error('이미 존재하는 휴가 종류 코드입니다.');
      }
    }

    const updateData: any = {};
    if (updateDto.name) updateData.name = updateDto.name;
    if (updateDto.code) updateData.code = updateDto.code;
    if (updateDto.colorHex) updateData.color_hex = updateDto.colorHex;
    if (updateDto.maxDaysYear !== undefined) updateData.max_days_year = updateDto.maxDaysYear;
    if (updateDto.isPaid !== undefined) updateData.is_paid = updateDto.isPaid;
    if (updateDto.requiresApproval !== undefined) updateData.requires_approval = updateDto.requiresApproval;

    const leaveType = await this.prisma.leave_type.update({
      where: { id: id },
      data: updateData
    });

    return {
      success: true,
      message: '휴가 종류가 수정되었습니다.',
      data: {
        id: leaveType.id,
        name: leaveType.name,
        code: leaveType.code,
        colorHex: leaveType.color_hex,
        maxDaysYear: leaveType.max_days_year,
        isPaid: leaveType.is_paid,
        requiresApproval: leaveType.requires_approval,
      }
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete leave type (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leave type deleted successfully' })
  async deleteLeaveType(
    @Param('id') id: string,
    @Request() req
  ) {
    this.checkHRPermissions(req.user);
    const tenantId = req.user.tenantId;

    // Check if leave type exists and belongs to the company
    const existingType = await this.prisma.leave_type.findFirst({
      where: {
        id: id,
        OR: [
          { company_id: tenantId },
          { company_id: null }
        ]
      }
    });

    if (!existingType) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    // Check if there are any leave requests using this type
    const existingRequests = await this.prisma.leave_request.findFirst({
      where: { leave_type_id: id }
    });

    if (existingRequests) {
      // Instead of hard delete, mark as inactive
      await this.prisma.leave_type.update({
        where: { id: id },
        data: { is_active: false }
      });

      return {
        success: true,
        message: '휴가 종류가 비활성화되었습니다. (기존 휴가 신청이 존재하여 완전 삭제되지 않았습니다)',
      };
    } else {
      // Safe to hard delete
      await this.prisma.leave_type.delete({
        where: { id: id }
      });

      return {
        success: true,
        message: '휴가 종류가 삭제되었습니다.',
      };
    }
  }
}