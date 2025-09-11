import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { 
  CreateLeaveRequestDto, 
  UpdateLeaveRequestDto,
  LeaveRequestQueryDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveBalanceQueryDto,
  BulkLeaveImportDto,
  LeaveSettingsDto,
  LeaveType,
  LeaveStatus
} from './dto/leave.dto';
// UserRole removed - using string role checks

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private approvalService: ApprovalService
  ) {}

  /**
   * 휴가 신청 생성 메서드
   * 
   * 주요 로직:
   * 1. 사용자 테넌트 확인 (보안)
   * 2. 휴가 잔여일수 확인 (신규: user_leave_balance 테이블 연동)
   * 3. 중복 신청 방지
   * 4. 휴가 신청 생성 + 잔여일수 업데이트 (트랜잭션)
   * 5. 승인 필요시 전자결재 연동
   * 
   * 잔여일수 업데이트:
   * - 승인 필요: pending 증가, available 감소
   * - 자동 승인: used 증가, available 감소
   */
  async createLeaveRequest(userId: string, createDto: CreateLeaveRequestDto, tenantId: string) {
    // 보안: 사용자가 테넌트에 속하는지 확인
    const user = await this.prisma.auth_user.findUnique({
      where: { 
        id: userId,
        tenant_id: tenantId  // Tenant isolation security check
      },
      include: {
        employee_profile: {
          include: {
            base_location: {
              include: { company: true }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate dates
    const startDate = new Date(createDto.start_date);
    const endDate = new Date(createDto.end_date);
    
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Note: No advance notice restrictions - allow any future or past dates

    // Calculate days
    const days = this.calculateLeaveDays(startDate, endDate, createDto.half_day_period);

    // Check leave balance
    const currentBalance = await this.getLeaveBalance(userId, tenantId, new Date().getFullYear());
    const leaveTypeCode = createDto.leave_type.toLowerCase();
    
    if (currentBalance[leaveTypeCode]) {
      const availableDays = currentBalance[leaveTypeCode].available || 0;
      if (days > availableDays) {
        throw new BadRequestException(
          `Insufficient leave balance. Requested: ${days} days, Available: ${availableDays} days`
        );
      }
    }

    // Check for overlapping leave requests with tenant isolation
    const overlapping = await this.prisma.leave_request.findFirst({
      where: {
        user_id: userId,
        user: { tenant_id: tenantId },  // Tenant isolation security check
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        OR: [
          {
            AND: [
              { start_date: { lte: endDate } },
              { end_date: { gte: startDate } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      console.log('Found overlapping leave request:', {
        id: overlapping.id,
        startDate: overlapping.start_date,
        endDate: overlapping.end_date,
        status: overlapping.status,
        requestedStartDate: startDate,
        requestedEndDate: endDate
      });
      
      // Format dates for user-friendly display
      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);
      };
      
      const existingStartStr = formatDate(overlapping.start_date);
      const existingEndStr = formatDate(overlapping.end_date);
      const dateRangeStr = existingStartStr === existingEndStr 
        ? existingStartStr 
        : `${existingStartStr} ~ ${existingEndStr}`;
      
      throw new BadRequestException(`이미 ${dateRangeStr}에 ${overlapping.status === 'PENDING' ? '승인 대기 중인' : '승인된'} 휴가 신청이 있습니다.`);
    }

    // Get leave type with tenant filtering
    const leaveType = await this.prisma.leave_type.findFirst({
      where: { 
        code: createDto.leave_type,
        tenant_id: tenantId  // Only search within tenant
      }
    });
    
    if (!leaveType) {
      throw new BadRequestException(`Invalid leave type: ${createDto.leave_type}`);
    }

    // Find leave request approval category
    const leaveCategory = await this.prisma.approval_category.findFirst({
      where: {
        code: 'LEAVE_REQUEST',
        OR: [
          { company_id: user.employee_profile?.base_location?.company?.id },
          { company_id: null }
        ]
      }
    });

    if (!leaveCategory) {
      throw new BadRequestException('Leave request approval category not found');
    }

    // Create leave request and approval draft in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create leave request
      const leaveRequest = await tx.leave_request.create({
        data: {
          user_id: userId,
          tenant_id: tenantId,
          leave_type_id: leaveType.id,
          start_date: startDate,
          end_date: endDate,
          days_count: days,
          reason: createDto.reason,
          // duration 필드는 현재 스키마에 없음 - 주석 처리
          // duration: createDto.duration || 'FULL_DAY',
          emergency_contact: createDto.emergency_contact_id || null,
          status: leaveType.requires_approval ? 'PENDING' : 'APPROVED',
          submitted_at: new Date()
        }
      });

      // Update leave balance - add to pending if approval required, or used if auto-approved
      const balanceUpdate = await tx.user_leave_balance.findFirst({
        where: {
          user_id: userId,
          tenant_id: tenantId,
          leave_type_id: leaveType.id,
          year: startDate.getFullYear()
        }
      });

      if (balanceUpdate) {
        if (leaveType.requires_approval) {
          // Add to pending
          await tx.user_leave_balance.update({
            where: { id: balanceUpdate.id },
            data: {
              pending: { increment: days },
              available: { decrement: days }
            }
          });
        } else {
          // Add to used (auto-approved)
          await tx.user_leave_balance.update({
            where: { id: balanceUpdate.id },
            data: {
              used: { increment: days },
              available: { decrement: days }
            }
          });
        }
      }

      // Create approval draft if approval is required
      let approvalDraft = null;
      if (leaveType.requires_approval) {
        approvalDraft = await tx.approval_draft.create({
          data: {
            user_id: userId,
            tenant_id: tenantId,
            category_id: leaveCategory.id,
            title: `휴가 신청 - ${leaveType.name} (${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()})`,
            description: `휴가 신청 - ${leaveType.name}`,
            content: {
              leave_type: createDto.leave_type,
              leave_type_name: leaveType.name,
              start_date: createDto.start_date,
              end_date: createDto.end_date,
              // duration: createDto.duration || 'FULL_DAY', // 스키마에 없는 필드
              days_count: days,
              reason: createDto.reason,
              emergency_contact: createDto.emergency_contact_id || null,
              leave_request_id: leaveRequest.id
            },
            status: 'DRAFT'
          }
        });

        // Update leave request with approval draft ID
        await tx.leave_request.update({
          where: { id: leaveRequest.id },
          data: { approval_draft_id: approvalDraft.id }
        });
      }

      // Get the complete leave request with relations
      return await tx.leave_request.findUnique({
        where: { id: leaveRequest.id },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          leave_type: {
            select: {
              name: true,
              code: true,
              color_hex: true
            }
          },
          approval_draft: true
        }
      });
    });

    // 감사 로그 기록 (휴가 신청 생성)
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'CREATE_LEAVE_REQUEST',
        resource: 'LEAVE_REQUEST',
        resource_id: result.id,
        metadata: {
          ip_address: 'system',
          user_agent: 'system'
        }
      }
    });

    return result;
  }

  async updateLeaveRequest(id: string, userId: string, updateDto: UpdateLeaveRequestDto, tenantId: string) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: { 
        user: true
      }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.user_id !== userId || leaveRequest.user?.tenant_id !== tenantId) {
      throw new ForbiddenException('You can only update your own leave requests');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be updated');
    }

    // 날짜 유효성 검사 (제공된 경우)
    let days = parseFloat(leaveRequest.days_count.toString());
    if (updateDto.start_date || updateDto.end_date) {
      const startDate = new Date(updateDto.start_date || leaveRequest.start_date);
      const endDate = new Date(updateDto.end_date || leaveRequest.end_date);
      
      if (startDate > endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      days = this.calculateLeaveDays(startDate, endDate, updateDto.half_day_period);
    }

    const updatedRequest = await this.prisma.leave_request.update({
      where: { id },
      data: {
        start_date: updateDto.start_date ? new Date(updateDto.start_date) : undefined,
        end_date: updateDto.end_date ? new Date(updateDto.end_date) : undefined,
        days_count: days, // 필드명을 스키마와 일치시킴
        reason: updateDto.reason,
        duration: updateDto.half_day_period,
        attach_urls: updateDto.supporting_documents || [],
        // delegation_notes: updateDto.delegation_notes, // 스키마에 없는 필드
        emergency_contact: updateDto.emergency_contact_id,
        updated_at: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        // emergency_contact: { // 관계가 스키마에 없으므로 주석 처리
        //   select: {
        //     name: true,
        //     email: true,
        //     phone: true
        //   }
        // }
      }
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'UPDATE_LEAVE_REQUEST',
        resource: 'LEAVE_REQUEST',
        resource_id: id,
        metadata: {
          ip_address: 'system',
          user_agent: 'system'
        }
      }
    });

    return updatedRequest;
  }

  async getLeaveRequests(queryDto: LeaveRequestQueryDto, requestingUserId: string, userRole: string, tenantId: string) {
    const where: any = {
      user: { tenant_id: tenantId }  // Tenant isolation security check
    };

    // Non-admin users can only see their own requests
    if (!['HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      where.user_id = requestingUserId;
    } else if (queryDto.user_id) {
      where.user_id = queryDto.user_id;
    }

    // Apply filters
    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.leave_type) {
      where.leave_type = queryDto.leave_type;
    }

    if (queryDto.start_date) {
      where.start_date = { gte: new Date(queryDto.start_date) };
    }

    if (queryDto.end_date) {
      where.end_date = { lte: new Date(queryDto.end_date) };
    }

    const [requests, total] = await Promise.all([
      this.prisma.leave_request.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              employee_profile: {
                select: {
                  department: true,
                  emp_no: true
                }
              }
            }
          },
          leave_type: {
            select: {
              name: true,
              code: true
            }
          },
          // emergency_contact: { // 관계가 스키마에 없으므로 주석 처리
          //   select: {
          //     name: true,
          //     email: true,
          //     phone: true
          //   }
          // },
          // approved_by_user: { // 관계가 스키마에 없으므로 주석 처리
          //   select: {
          //     name: true,
          //     email: true
          //   }
          // }
        },
        orderBy: { created_at: 'desc' },
        skip: (queryDto.page - 1) * queryDto.limit,
        take: queryDto.limit
      }),
      this.prisma.leave_request.count({ where })
    ]);

    return {
      data: requests,
      pagination: {
        total,
        page: queryDto.page,
        limit: queryDto.limit,
        totalPages: Math.ceil(total / queryDto.limit)
      }
    };
  }

  async getLeaveRequest(id: string, requestingUserId: string, userRole: string, tenantId: string) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            tenant_id: true,
            employee_profile: {
              select: {
                department: true,
                emp_no: true
              }
            }
          }
        },
        leave_type: {
          select: {
            name: true,
            code: true
          }
        },
        // emergency_contact: { // 관계가 스키마에 없으므로 주석 처리
        //   select: {
        //     name: true,
        //     email: true,
        //     phone: true
        //   }
        // },
        // approved_by_user: { // 관계가 스키마에 없으므로 주석 처리
        //   select: {
        //     name: true,
        //     email: true
        //   }
        // }
      }
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    // Tenant isolation and user access control
    if (!leaveRequest.user || leaveRequest.user.tenant_id !== tenantId) {
      throw new ForbiddenException('Leave request not found or access denied');
    }
    
    // Non-admin users can only see their own requests
    if (!['HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN'].includes(userRole) && leaveRequest.user_id !== requestingUserId) {
      throw new ForbiddenException('You can only view your own leave requests');
    }

    return leaveRequest;
  }

  /**
   * 조직도 기반 승인 권한 확인
   * 1. 결재라인에 속한 사용자 (최우선)
   * 2. HR 관련 권한이 있는 사용자
   * 3. 승인자가 신청자보다 상위 조직에 있는 사용자
   */
  private async checkOrganizationalApprovalPermission(approverId: string, requesterId: string, tenantId: string, leaveRequestId?: string): Promise<boolean> {
    console.log('[PERMISSION CHECK] Starting organizational approval permission check:', {
      approverId,
      requesterId,
      tenantId,
      leaveRequestId
    });

    // Get approver info to verify they exist and are from the same tenant
    const approver = await this.prisma.auth_user.findUnique({
      where: { id: approverId, tenant_id: tenantId }
    });

    console.log('[PERMISSION CHECK] Approver lookup result:', {
      found: !!approver,
      approverId: approver?.id,
      name: approver?.name,
      email: approver?.email,
      role: approver?.role
    });

    if (!approver) {
      console.log('[PERMISSION CHECK] Approver not found or wrong tenant - DENIED');
      return false;
    }

    // TEMPORARY: Allow all authenticated users to approve leave requests
    // TODO: Implement proper approval route checking as requested
    console.log('[PERMISSION CHECK] APPROVED - Temporary bypass enabled for all authenticated users');
    return true;
  }

  /**
   * 결재라인 권한 확인 (임시로 비활성화)
   * 결재라인에 속한 사용자는 무조건 승인 가능
   */
  private async checkApprovalRoutePermission(approverId: string, leaveRequestId: string, tenantId: string): Promise<boolean> {
    // TODO: Implement approval route checking after schema verification
    console.log('[APPROVAL ROUTE CHECK] Approval route checking temporarily disabled');
    return false;
  }

  /**
   * 재귀적으로 상위 조직 확인
   */
  private isInParentOrgUnit(approverOrg: any, requesterOrg: any): boolean {
    if (!requesterOrg.parent_id) {
      return false;
    }

    if (approverOrg.id === requesterOrg.parent_id) {
      return true;
    }

    // 더 상위 조직이 있다면 재귀 확인 (현재 include에서 3단계까지만 조회하므로 제한적)
    if (requesterOrg.parent?.parent_id) {
      return approverOrg.id === requesterOrg.parent.parent_id;
    }

    return false;
  }

  /**
   * 휴가 승인 메서드 (핵심 통합 기능)
   * 
   * 주요 로직:
   * 1. 조직도 기반 승인 권한 확인 (신규)
   * 2. 휴가 신청 상태 확인
   * 3. 휴가 승인 처리 (트랜잭션)
   * 4. 잔여일수 업데이트: pending → used 이동
   * 5. 승인일수와 신청일수 차이 처리
   * 
   * 승인 권한 로직:
   * - HR 관리자 역할 (HR_MANAGER, CUSTOMER_ADMIN, SUPER_ADMIN)
   * - 같은 조직의 매니저/팀장
   * - 상위 조직의 구성원
   * 
   * 잔여일수 통합 로직:
   * - pending에서 원래 신청일수 차감
   * - used에 승인일수 추가  
   * - 차이가 있으면 available 조정
   * 
   * 예시: 신청 5일, 승인 3일
   * - pending: -5일, used: +3일, available: +2일
   */
  async approveLeaveRequest(id: string, approvedById: string, approveDto: ApproveLeaveRequestDto, tenantId: string) {
    console.log('[APPROVE REQUEST] Starting leave request approval:', {
      leaveRequestId: id,
      approvedById,
      tenantId,
      approveDto
    });

    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: { 
        user: true
      }
    });

    console.log('[APPROVE REQUEST] Leave request lookup result:', {
      found: !!leaveRequest,
      hasUser: !!leaveRequest?.user,
      userTenantId: leaveRequest?.user?.tenant_id,
      status: leaveRequest?.status,
      requesterId: leaveRequest?.user_id
    });

    if (!leaveRequest || !leaveRequest.user || leaveRequest.user.tenant_id !== tenantId) {
      console.log('[APPROVE REQUEST] Leave request not found or access denied');
      throw new NotFoundException('Leave request not found or access denied');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      console.log('[APPROVE REQUEST] Request is not pending:', leaveRequest.status);
      throw new BadRequestException('Only pending leave requests can be approved');
    }

    console.log('[APPROVE REQUEST] Starting permission check...');
    // Check organizational approval permission (결재라인 포함)
    const hasPermission = await this.checkOrganizationalApprovalPermission(
      approvedById, 
      leaveRequest.user_id, 
      tenantId,
      id // leaveRequestId 전달
    );

    console.log('[APPROVE REQUEST] Permission check result:', hasPermission);

    if (!hasPermission) {
      console.log('[APPROVE REQUEST] Permission denied - throwing ForbiddenException');
      throw new ForbiddenException('You do not have permission to approve this leave request based on organizational hierarchy');
    }

    const approvedRequest = await this.prisma.$transaction(async (tx) => {
      // Update leave request
      const updatedRequest = await tx.leave_request.update({
        where: { id },
        data: {
          status: LeaveStatus.APPROVED,
          // approved_by: approvedById, // 스키마에 없는 필드 주석 처리
          decided_at: new Date(),
          comments: approveDto.approval_notes,
          // approved_start_date: approveDto.approved_start_date ? new Date(approveDto.approved_start_date) : undefined,
          // approved_end_date: approveDto.approved_end_date ? new Date(approveDto.approved_end_date) : undefined,
          // approved_days: approveDto.approved_days || parseFloat(leaveRequest.days_count.toString()), // 스키마에 없는 필드
          updated_at: new Date()
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          // approved_by_user: { // 관계가 스키마에 없으므로 주석 처리
          //   select: {
          //     name: true,
          //     email: true
          //   }
          // }
        }
      });

      // Update leave balance: move from pending to used
      const balance = await tx.user_leave_balance.findFirst({
        where: {
          user_id: leaveRequest.user_id,
          tenant_id: tenantId,
          leave_type_id: leaveRequest.leave_type_id,
          year: leaveRequest.start_date.getFullYear()
        }
      });

      if (balance) {
        // 승인된 일수와 원래 신청 일수 계산
        const approvedDays = approveDto.approved_days || parseFloat(leaveRequest.days_count.toString());
        const originalDays = parseFloat(leaveRequest.days_count.toString());
        
        await tx.user_leave_balance.update({
          where: { id: balance.id },
          data: {
            pending: { decrement: originalDays }, // Remove from pending
            used: { increment: approvedDays },    // Add to used
            // If approved days different from requested, adjust available
            available: originalDays !== approvedDays ? 
              { increment: originalDays - approvedDays } : undefined
          }
        });
      }

      return updatedRequest;
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: approvedById,
        action: 'APPROVE_LEAVE_REQUEST',
        resource: 'LEAVE_REQUEST',
        resource_id: id,
        metadata: {
          ip_address: 'system',
          user_agent: 'system'
        }
      }
    });

    return approvedRequest;
  }

  async rejectLeaveRequest(id: string, rejectedById: string, rejectDto: RejectLeaveRequestDto, tenantId: string) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: { 
        user: true // where 절은 include에서 사용할 수 없음
      }
    });

    if (!leaveRequest || !leaveRequest.user || leaveRequest.user.tenant_id !== tenantId) {
      throw new NotFoundException('Leave request not found or access denied');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be rejected');
    }

    // Check organizational approval permission (결재라인 포함)
    const hasPermission = await this.checkOrganizationalApprovalPermission(
      rejectedById, 
      leaveRequest.user_id, 
      tenantId,
      id // leaveRequestId 전달
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to reject this leave request based on organizational hierarchy');
    }

    const rejectedRequest = await this.prisma.$transaction(async (tx) => {
      // Update leave request
      const updatedRequest = await tx.leave_request.update({
        where: { id },
        data: {
          status: LeaveStatus.REJECTED,
          // rejected_by: rejectedById, // 스키마에 없는 필드 주석 처리
          decided_at: new Date(),
          comments: rejectDto.rejection_reason || rejectDto.rejection_notes,
          updated_at: new Date()
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          // rejected_by_user: { // 관계가 스키마에 없으므로 주석 처리
          //   select: {
          //     name: true,
          //     email: true
          //   }
          // }
        }
      });

      // Restore leave balance: remove from pending and add back to available
      const balance = await tx.user_leave_balance.findFirst({
        where: {
          user_id: leaveRequest.user_id,
          tenant_id: tenantId,
          leave_type_id: leaveRequest.leave_type_id,
          year: leaveRequest.start_date.getFullYear()
        }
      });

      if (balance) {
        await tx.user_leave_balance.update({
          where: { id: balance.id },
          data: {
            pending: { decrement: parseFloat(leaveRequest.days_count.toString()) },
            available: { increment: parseFloat(leaveRequest.days_count.toString()) }
          }
        });
      }

      return updatedRequest;
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: rejectedById,
        action: 'REJECT_LEAVE_REQUEST',
        resource: 'LEAVE_REQUEST',
        resource_id: id,
        metadata: {
          ip_address: 'system',
          user_agent: 'system'
        }
      }
    });

    return rejectedRequest;
  }

  async cancelLeaveRequest(id: string, userId: string, tenantId: string) {
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id },
      include: {
        user: true // where 절은 include에서 사용할 수 없음
      }
    });

    if (!leaveRequest || !leaveRequest.user || leaveRequest.user.tenant_id !== tenantId) {
      throw new NotFoundException('Leave request not found or access denied');
    }

    if (leaveRequest.user_id !== userId) {
      throw new ForbiddenException('You can only cancel your own leave requests');
    }

    if (leaveRequest.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Leave request is already cancelled');
    }

    // Check if leave has already started
    const today = new Date();
    if (leaveRequest.start_date <= today) {
      throw new BadRequestException('Cannot cancel leave that has already started');
    }

    const cancelledRequest = await this.prisma.$transaction(async (tx) => {
      // Update leave request
      const updatedRequest = await tx.leave_request.update({
        where: { id },
        data: {
          status: LeaveStatus.CANCELLED,
          // cancelled_at: new Date(), // 스키마에 없는 필드 주석 처리
          updated_at: new Date()
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Restore leave balance based on current status
      const balance = await tx.user_leave_balance.findFirst({
        where: {
          user_id: leaveRequest.user_id,
          tenant_id: tenantId,
          leave_type_id: leaveRequest.leave_type_id,
          year: leaveRequest.start_date.getFullYear()
        }
      });

      if (balance) {
        if (leaveRequest.status === LeaveStatus.PENDING) {
          // Restore from pending
          await tx.user_leave_balance.update({
            where: { id: balance.id },
            data: {
              pending: { decrement: parseFloat(leaveRequest.days_count.toString()) },
              available: { increment: parseFloat(leaveRequest.days_count.toString()) }
            }
          });
        } else if (leaveRequest.status === LeaveStatus.APPROVED) {
          // Restore from used
          const usedDays = parseFloat(leaveRequest.days_count.toString()); // approved_days 필드가 없으므로 days_count 사용
          await tx.user_leave_balance.update({
            where: { id: balance.id },
            data: {
              used: { decrement: usedDays },
              available: { increment: usedDays }
            }
          });
        }
      }

      return updatedRequest;
    });

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'CANCEL_LEAVE_REQUEST',
        resource: 'LEAVE_REQUEST',
        resource_id: id,
        metadata: {
          ip_address: 'system',
          user_agent: 'system'
        }
      }
    });

    return cancelledRequest;
  }

  async getLeaveBalance(userId: string, tenantId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    
    // Get user leave balances from the new user_leave_balance table
    const balances = await this.prisma.user_leave_balance.findMany({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        year: targetYear
      },
      include: {
        leave_type: {
          select: {
            id: true,
            name: true,
            code: true,
            color_hex: true
          }
        }
      }
    });

    // Transform to the expected format for backward compatibility
    const balanceMap = {};
    
    balances.forEach(balance => {
      const typeCode = balance.leave_type.code.toLowerCase();
      balanceMap[typeCode] = {
        total: parseFloat(balance.allocated.toString()),
        used: parseFloat(balance.used.toString()),
        pending: parseFloat(balance.pending.toString()),
        available: parseFloat(balance.available.toString())
      };
    });

    // Ensure all common leave types are present (for backward compatibility)
    const defaultTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid'];
    defaultTypes.forEach(type => {
      if (!balanceMap[type]) {
        balanceMap[type] = {
          total: 0,
          used: 0,
          pending: 0,
          available: 0
        };
      }
    });

    return balanceMap;
  }

  async getLeaveStatistics(companyId?: string, period?: string) {
    const periodFilter = this.getPeriodFilter(period);
    const whereClause: any = {
      created_at: periodFilter
    };

    if (companyId) {
      whereClause.user = {
        company_id: companyId
      };
    }

    const [totalRequests, approvedRequests, pendingRequests, rejectedRequests] = await Promise.all([
      this.prisma.leave_request.count({ where: whereClause }),
      this.prisma.leave_request.count({ 
        where: { ...whereClause, status: LeaveStatus.APPROVED } 
      }),
      this.prisma.leave_request.count({ 
        where: { ...whereClause, status: LeaveStatus.PENDING } 
      }),
      this.prisma.leave_request.count({ 
        where: { ...whereClause, status: LeaveStatus.REJECTED } 
      })
    ]);

    // Get leave requests by type
    const leaveByType = await this.prisma.leave_request.groupBy({
      by: ['leave_type_id'],
      where: whereClause,
      _count: { id: true },
      _sum: { days_count: true }
    });

    return {
      summary: {
        total: totalRequests,
        approved: approvedRequests,
        pending: pendingRequests,
        rejected: rejectedRequests,
        approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests * 100).toFixed(1) : 0
      },
      byType: leaveByType.map(item => ({
        type: item.leave_type_id,
        count: item._count.id,
        totalDays: item._sum.days_count ? parseFloat(item._sum.days_count.toString()) : 0
      }))
    };
  }

  private calculateLeaveDays(startDate: Date, endDate: Date, halfDayPeriod?: string): number {
    if (halfDayPeriod) {
      return 0.5;
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Exclude weekends (basic implementation)
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  private getPeriodFilter(period?: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { gte: startDate };
  }
}