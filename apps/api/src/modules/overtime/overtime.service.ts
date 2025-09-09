import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateOvertimeRequestDto,
  UpdateOvertimeRequestDto,
  ApproveOvertimeRequestDto,
  RejectOvertimeRequestDto,
  UploadOvertimeAttachmentDto,
  CreateOvertimePolicyDto,
  UpdateOvertimePolicyDto,
  GetOvertimeRequestsDto,
  OvertimeStatus,
  OvertimeType
} from './dto/overtime.dto';

@Injectable()
export class OvertimeService {
  constructor(private prisma: PrismaService) {}

  // ================================
  // Overtime Request Management
  // ================================

  async createOvertimeRequest(userId: string, companyId: string, dto: CreateOvertimeRequestDto) {
    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);
    
    // 시간 검증
    if (endTime <= startTime) {
      throw new BadRequestException('종료 시간은 시작 시간보다 늦어야 합니다.');
    }

    // 총 근무 시간 계산 (시간 단위)
    const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    if (totalHours > 24) {
      throw new BadRequestException('일일 추가근무는 24시간을 초과할 수 없습니다.');
    }

    // 정책 확인 (있는 경우)
    const policy = await this.getApplicablePolicy(companyId, dto.overtime_type, userId);
    
    if (policy) {
      // 일일 최대 시간 확인
      if (policy.max_daily_hours && totalHours > Number(policy.max_daily_hours)) {
        throw new BadRequestException(`일일 최대 추가근무 시간(${policy.max_daily_hours}시간)을 초과했습니다.`);
      }

      // 사전 신청 시간 확인
      if (policy.advance_notice_hours) {
        const workDate = new Date(dto.work_date);
        const now = new Date();
        const hoursUntilWork = (workDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilWork < policy.advance_notice_hours) {
          throw new BadRequestException(`최소 ${policy.advance_notice_hours}시간 전에 신청해야 합니다.`);
        }
      }
    }

    // 중복 신청 확인
    const existingRequest = await this.prisma.overtime_request.findFirst({
      where: {
        user_id: userId,
        work_date: new Date(dto.work_date),
        status: {
          in: ['PENDING', 'APPROVED']
        }
      }
    });

    if (existingRequest) {
      throw new BadRequestException('해당 날짜에 이미 추가근무 신청이 있습니다.');
    }

    return await this.prisma.overtime_request.create({
      data: {
        ...dto,
        user_id: userId,
        company_id: companyId,
        work_date: new Date(dto.work_date),
        start_time: startTime,
        end_time: endTime,
        total_hours: totalHours,
        hourly_rate: policy?.base_hourly_rate ? Number(policy.base_hourly_rate) * Number(policy.rate_multiplier) : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attachments: true,
        approval_draft: true
      }
    });
  }

  async getOvertimeRequests(companyId: string, query: GetOvertimeRequestsDto) {
    const { page, limit, overtime_type, status, start_date, end_date, user_id } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      company_id: companyId
    };

    if (overtime_type) where.overtime_type = overtime_type;
    if (status) where.status = status;
    if (user_id) where.user_id = user_id;
    
    if (start_date || end_date) {
      where.work_date = {};
      if (start_date) where.work_date.gte = new Date(start_date);
      if (end_date) where.work_date.lte = new Date(end_date);
    }

    const [requests, total] = await Promise.all([
      this.prisma.overtime_request.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              title: true
            }
          },
          approved_by_user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attachments: true,
          approval_draft: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      }),
      this.prisma.overtime_request.count({ where })
    ]);

    return {
      data: requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getOvertimeRequestById(requestId: string, userId?: string) {
    const request = await this.prisma.overtime_request.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            title: true
          }
        },
        approved_by_user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attachments: {
          include: {
            uploaded_by_user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        approval_draft: true
      }
    });

    if (!request) {
      throw new NotFoundException('추가근무 신청을 찾을 수 없습니다.');
    }

    // 권한 확인 (본인 또는 관리자만 조회 가능)
    if (userId && request.user_id !== userId) {
      // TODO: 관리자 권한 체크 로직 추가
    }

    return request;
  }

  async updateOvertimeRequest(requestId: string, userId: string, dto: UpdateOvertimeRequestDto) {
    const request = await this.prisma.overtime_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('추가근무 신청을 찾을 수 없습니다.');
    }

    if (request.user_id !== userId) {
      throw new ForbiddenException('본인의 신청만 수정할 수 있습니다.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 신청만 수정할 수 있습니다.');
    }

    const updateData: any = { ...dto };

    // 시간 정보가 변경된 경우 총 시간 재계산
    if (dto.start_time || dto.end_time) {
      const startTime = dto.start_time ? new Date(dto.start_time) : request.start_time;
      const endTime = dto.end_time ? new Date(dto.end_time) : request.end_time;
      
      if (endTime <= startTime) {
        throw new BadRequestException('종료 시간은 시작 시간보다 늦어야 합니다.');
      }

      const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      updateData.total_hours = totalHours;
      
      if (dto.start_time) updateData.start_time = startTime;
      if (dto.end_time) updateData.end_time = endTime;
    }

    if (dto.work_date) {
      updateData.work_date = new Date(dto.work_date);
    }

    return await this.prisma.overtime_request.update({
      where: { id: requestId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attachments: true,
        approval_draft: true
      }
    });
  }

  async approveOvertimeRequest(requestId: string, approverId: string, dto: ApproveOvertimeRequestDto) {
    const request = await this.prisma.overtime_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('추가근무 신청을 찾을 수 없습니다.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 신청만 승인할 수 있습니다.');
    }

    const approvedHours = dto.approved_hours || Number(request.total_hours);
    const hourlyRate = dto.hourly_rate || Number(request.hourly_rate) || 0;
    const totalPayment = approvedHours * hourlyRate;

    return await this.prisma.overtime_request.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approved_by: approverId,
        approved_at: new Date(),
        approved_hours: approvedHours,
        hourly_rate: hourlyRate,
        total_payment: totalPayment
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approved_by_user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async rejectOvertimeRequest(requestId: string, approverId: string, dto: RejectOvertimeRequestDto) {
    const request = await this.prisma.overtime_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('추가근무 신청을 찾을 수 없습니다.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 신청만 거절할 수 있습니다.');
    }

    return await this.prisma.overtime_request.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approved_by: approverId,
        approved_at: new Date(),
        rejection_reason: dto.rejection_reason
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approved_by_user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async deleteOvertimeRequest(requestId: string, userId: string) {
    const request = await this.prisma.overtime_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('추가근무 신청을 찾을 수 없습니다.');
    }

    if (request.user_id !== userId) {
      throw new ForbiddenException('본인의 신청만 삭제할 수 있습니다.');
    }

    if (request.status === 'APPROVED') {
      throw new BadRequestException('승인된 신청은 삭제할 수 없습니다.');
    }

    await this.prisma.overtime_request.delete({
      where: { id: requestId }
    });

    return { message: '추가근무 신청이 삭제되었습니다.' };
  }

  // ================================
  // File Attachment Management
  // ================================

  async uploadAttachment(requestId: string, userId: string, dto: UploadOvertimeAttachmentDto) {
    const request = await this.prisma.overtime_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('추가근무 신청을 찾을 수 없습니다.');
    }

    if (request.user_id !== userId) {
      throw new ForbiddenException('본인의 신청에만 파일을 첨부할 수 있습니다.');
    }

    return await this.prisma.overtime_attachment.create({
      data: {
        ...dto,
        overtime_request_id: requestId,
        uploaded_by: userId
      },
      include: {
        uploaded_by_user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.overtime_attachment.findUnique({
      where: { id: attachmentId },
      include: {
        overtime_request: true
      }
    });

    if (!attachment) {
      throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    }

    if (attachment.uploaded_by !== userId && attachment.overtime_request.user_id !== userId) {
      throw new ForbiddenException('본인이 업로드한 파일만 삭제할 수 있습니다.');
    }

    await this.prisma.overtime_attachment.delete({
      where: { id: attachmentId }
    });

    return { message: '첨부파일이 삭제되었습니다.' };
  }

  // ================================
  // Overtime Policy Management
  // ================================

  async createOvertimePolicy(companyId: string, dto: CreateOvertimePolicyDto) {
    return await this.prisma.overtime_policy.create({
      data: {
        ...dto,
        company_id: companyId,
        applicable_roles: dto.applicable_roles || [],
        applicable_departments: dto.applicable_departments || [],
        effective_from: dto.effective_from ? new Date(dto.effective_from) : new Date(),
        effective_until: dto.effective_until ? new Date(dto.effective_until) : null
      }
    });
  }

  async getOvertimePolicies(companyId: string) {
    return await this.prisma.overtime_policy.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateOvertimePolicy(policyId: string, dto: UpdateOvertimePolicyDto) {
    const policy = await this.prisma.overtime_policy.findUnique({
      where: { id: policyId }
    });

    if (!policy) {
      throw new NotFoundException('추가근무 정책을 찾을 수 없습니다.');
    }

    const updateData: any = { ...dto };
    
    if (dto.effective_from) {
      updateData.effective_from = new Date(dto.effective_from);
    }
    
    if (dto.effective_until) {
      updateData.effective_until = new Date(dto.effective_until);
    }

    return await this.prisma.overtime_policy.update({
      where: { id: policyId },
      data: updateData
    });
  }

  async deleteOvertimePolicy(policyId: string) {
    const policy = await this.prisma.overtime_policy.findUnique({
      where: { id: policyId }
    });

    if (!policy) {
      throw new NotFoundException('추가근무 정책을 찾을 수 없습니다.');
    }

    await this.prisma.overtime_policy.delete({
      where: { id: policyId }
    });

    return { message: '추가근무 정책이 삭제되었습니다.' };
  }

  // ================================
  // Helper Methods
  // ================================

  private async getApplicablePolicy(companyId: string, overtimeType: OvertimeType, userId: string) {
    return await this.prisma.overtime_policy.findFirst({
      where: {
        company_id: companyId,
        overtime_type: overtimeType,
        is_active: true,
        effective_from: {
          lte: new Date()
        },
        OR: [
          { effective_until: null },
          { effective_until: { gte: new Date() } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getUserOvertimeRequests(userId: string, query: GetOvertimeRequestsDto) {
    const { page, limit, overtime_type, status, start_date, end_date } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: userId
    };

    if (overtime_type) where.overtime_type = overtime_type;
    if (status) where.status = status;
    
    if (start_date || end_date) {
      where.work_date = {};
      if (start_date) where.work_date.gte = new Date(start_date);
      if (end_date) where.work_date.lte = new Date(end_date);
    }

    const [requests, total] = await Promise.all([
      this.prisma.overtime_request.findMany({
        where,
        include: {
          approved_by_user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          attachments: true,
          approval_draft: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      }),
      this.prisma.overtime_request.count({ where })
    ]);

    return {
      data: requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getOvertimeStatistics(companyId: string, startDate?: string, endDate?: string) {
    const where: any = {
      company_id: companyId,
      status: 'APPROVED'
    };

    if (startDate || endDate) {
      where.work_date = {};
      if (startDate) where.work_date.gte = new Date(startDate);
      if (endDate) where.work_date.lte = new Date(endDate);
    }

    const [totalRequests, totalHours, totalPayment, typeStats] = await Promise.all([
      this.prisma.overtime_request.count({ where }),
      this.prisma.overtime_request.aggregate({
        where,
        _sum: {
          approved_hours: true
        }
      }),
      this.prisma.overtime_request.aggregate({
        where,
        _sum: {
          total_payment: true
        }
      }),
      this.prisma.overtime_request.groupBy({
        by: ['overtime_type'],
        where,
        _count: {
          id: true
        },
        _sum: {
          approved_hours: true,
          total_payment: true
        }
      })
    ]);

    return {
      totalRequests,
      totalHours: totalHours._sum.approved_hours || 0,
      totalPayment: totalPayment._sum.total_payment || 0,
      byType: typeStats.map(stat => ({
        type: stat.overtime_type,
        count: stat._count.id,
        hours: stat._sum.approved_hours || 0,
        payment: stat._sum.total_payment || 0
      }))
    };
  }
}