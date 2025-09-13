import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { ApproveLeaveRequestDto, RejectLeaveRequestDto, LeaveStatus } from './dto/leave.dto';

@Injectable()
export class LeaveSequentialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Sequential Leave Approval - Step by step approval process
   */
  async approveLeaveRequest(
    leaveRequestId: string,
    approverId: string,
    approveDto: ApproveLeaveRequestDto,
    tenantId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      console.log('=== SEQUENTIAL APPROVAL START ===');
      console.log('Request ID:', leaveRequestId);
      console.log('Approver ID:', approverId);
      console.log('Tenant ID:', tenantId);

      // 1. Get leave request with current details
      const leaveRequest = await tx.leave_request.findFirst({
        where: {
          id: leaveRequestId,
          tenant_id: tenantId,
        },
        include: {
          user: true,
          leave_type: true,
        },
      });

      if (!leaveRequest || leaveRequest.status !== LeaveStatus.PENDING) {
        throw new BadRequestException('Invalid leave request or already processed');
      }

      console.log('Leave Request Found:', {
        id: leaveRequest.id,
        status: leaveRequest.status,
      });

      // 2. Get current approvers
      const approvers = await tx.$queryRaw`
        SELECT * FROM leave_request_approvers 
        WHERE leave_request_id = ${leaveRequestId} 
        ORDER BY step_order ASC
      ` as any[];

      console.log('Approvers:', approvers.map(a => ({
        step: a.step_order,
        name: a.approver_name,
        status: a.status,
        user_id: a.approver_user_id
      })));

      // 3. Find current approver - determine current step from approvers
      const currentStep = approvers.find(a => a.status === 'PENDING')?.step_order || 1;
      const currentApprover = approvers.find(
        a => a.approver_user_id === approverId && a.step_order === currentStep
      );

      if (!currentApprover) {
        throw new ForbiddenException('You are not authorized to approve this request at this step');
      }

      if (currentApprover.status !== 'PENDING') {
        throw new BadRequestException('This request has already been processed by you');
      }

      console.log('Current Approver:', {
        name: currentApprover.approver_name,
        step: currentApprover.step_order,
        status: currentApprover.status,
      });

      // 4. Update current approver status
      await tx.$executeRaw`
        UPDATE leave_request_approvers 
        SET status = 'APPROVED',
            approved_at = NOW(),
            comments = ${approveDto.approval_notes || 'Approved'},
            updated_at = NOW()
        WHERE id = ${currentApprover.id}
      `;

      console.log('Updated approver status to APPROVED');

      // 5. Check if this is the final approval
      const totalSteps = approvers.length;
      const isLastStep = currentStep >= totalSteps;

      console.log('Step Analysis:', {
        currentStep,
        totalSteps,
        isLastStep,
      });

      if (isLastStep) {
        // FINAL APPROVAL - Complete the leave request
        console.log('=== FINAL APPROVAL ===');

        // Update leave request to approved
        const finalRequest = await tx.leave_request.update({
          where: { id: leaveRequestId },
          data: {
            status: LeaveStatus.APPROVED,
            decided_by: approverId,
            decided_at: new Date(),
            comments: approveDto.approval_notes || 'Approved',
            updated_at: new Date(),
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            leave_type: { select: { name: true, code: true } },
          },
        });

        // Update leave balance: move from pending to used
        await this.updateLeaveBalance(
          tx,
          leaveRequest.user_id,
          leaveRequest.leave_type_id,
          parseFloat(leaveRequest.days_count.toString()),
          tenantId,
          leaveRequest.start_date.getFullYear()
        );

        // Create notification for requester - FINAL APPROVED
        await this.createNotification(
          tx,
          leaveRequestId,
          leaveRequest.user_id,
          approverId,
          'FINAL_APPROVED',
          '휴가 신청이 최종 승인되었습니다',
          `${leaveRequest.leave_type.name} 휴가 신청이 모든 승인 단계를 거쳐 최종 승인되었습니다.`
        );

        console.log('=== FINAL APPROVAL COMPLETED ===');

        return {
          success: true,
          message: '휴가 신청이 최종 승인되었습니다.',
          status: 'APPROVED',
          final_approval: true,
          data: finalRequest,
        };

      } else {
        // INTERMEDIATE APPROVAL - Move to next step
        console.log('=== INTERMEDIATE APPROVAL ===');

        const nextStep = currentStep + 1;
        
        // Update leave request status
        await tx.leave_request.update({
          where: { id: leaveRequestId },
          data: {
            updated_at: new Date(),
          },
        });

        // Find next approver
        const nextApprover = approvers.find(a => a.step_order === nextStep);

        if (nextApprover) {
          // Create notification for next approver
          await this.createNotification(
            tx,
            leaveRequestId,
            nextApprover.approver_user_id,
            approverId,
            'APPROVAL_NEEDED',
            '휴가 승인 요청',
            `${leaveRequest.user.name}님의 ${leaveRequest.leave_type.name} 휴가 신청이 ${currentStep}단계 승인을 거쳐 ${nextStep}단계 승인을 기다리고 있습니다.`
          );

          // Mark notification as sent for next approver
          await tx.$executeRaw`
            UPDATE leave_request_approvers 
            SET notification_sent = true 
            WHERE id = ${nextApprover.id}
          `;

          console.log('Next approver notified:', nextApprover.approver_name);
        }

        // Create notification for requester - STEP APPROVED
        await this.createNotification(
          tx,
          leaveRequestId,
          leaveRequest.user_id,
          approverId,
          'APPROVED',
          `휴가 신청 ${currentStep}단계 승인 완료`,
          `${currentApprover.approver_name}님이 휴가 신청을 승인했습니다. (${currentStep}/${totalSteps} 단계 완료)`
        );

        console.log('=== INTERMEDIATE APPROVAL COMPLETED ===');

        return {
          success: true,
          message: `${currentStep}단계 승인이 완료되었습니다. ${nextStep}단계 승인을 기다리고 있습니다.`,
          status: 'PENDING',
          current_step: nextStep,
          total_steps: totalSteps,
          next_approver: nextApprover ? {
            name: nextApprover.approver_name,
            email: nextApprover.approver_email
          } : null,
        };
      }
    });
  }

  /**
   * Sequential Leave Rejection
   */
  async rejectLeaveRequest(
    leaveRequestId: string,
    rejecterId: string,
    rejectDto: RejectLeaveRequestDto,
    tenantId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      console.log('=== SEQUENTIAL REJECTION START ===');

      // Get leave request
      const leaveRequest = await tx.leave_request.findFirst({
        where: {
          id: leaveRequestId,
          tenant_id: tenantId,
        },
        include: {
          user: true,
          leave_type: true,
        },
      });

      if (!leaveRequest || leaveRequest.status !== LeaveStatus.PENDING) {
        throw new BadRequestException('Invalid leave request or already processed');
      }

      // Get current approvers
      const approvers = await tx.$queryRaw`
        SELECT * FROM leave_request_approvers 
        WHERE leave_request_id = ${leaveRequestId} 
        ORDER BY step_order ASC
      ` as any[];

      // Get current approver - determine current step from approvers
      const currentStep = approvers.find(a => a.status === 'PENDING')?.step_order || 1;

      const currentApprover = approvers.find(
        a => a.approver_user_id === rejecterId && a.step_order === currentStep
      );

      if (!currentApprover) {
        throw new ForbiddenException('You are not authorized to reject this request at this step');
      }

      // Update approver status to rejected
      await tx.$executeRaw`
        UPDATE leave_request_approvers 
        SET status = 'REJECTED',
            rejected_at = NOW(),
            comments = ${rejectDto.rejection_reason || 'Rejected'},
            updated_at = NOW()
        WHERE id = ${currentApprover.id}
      `;

      // Update leave request to rejected
      const rejectedRequest = await tx.leave_request.update({
        where: { id: leaveRequestId },
        data: {
          status: LeaveStatus.REJECTED,
          decided_by: rejecterId,
          decided_at: new Date(),
          comments: rejectDto.rejection_reason || 'Rejected',
          updated_at: new Date(),
        },
        include: {
          user: { select: { name: true, email: true } },
          leave_type: { select: { name: true, code: true } },
        },
      });

      // Restore leave balance: move from pending back to available
      await this.restoreLeaveBalance(
        tx,
        leaveRequest.user_id,
        leaveRequest.leave_type_id,
        parseFloat(leaveRequest.days_count.toString()),
        tenantId,
        leaveRequest.start_date.getFullYear()
      );

      // Create notification for requester
      await this.createNotification(
        tx,
        leaveRequestId,
        leaveRequest.user_id,
        rejecterId,
        'REJECTED',
        '휴가 신청이 반려되었습니다',
        `${currentApprover.approver_name}님이 휴가 신청을 반려했습니다. 사유: ${rejectDto.rejection_reason || '사유 없음'}`
      );

      console.log('=== SEQUENTIAL REJECTION COMPLETED ===');

      return {
        success: true,
        message: '휴가 신청이 반려되었습니다.',
        status: 'REJECTED',
        data: rejectedRequest,
      };
    });
  }

  /**
   * Get approvers for a leave request - using modern approval system
   */
  async getApprovers(leaveRequestId: string) {
    // Get approval route info from the approval system
    const leaveRequest = await this.prisma.leave_request.findUnique({
      where: { id: leaveRequestId },
      include: {
        approval_draft: {
          include: {
            route: {
              include: {
                stages: {
                  include: {
                    approvers: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true
                          }
                        }
                      }
                    }
                  },
                  orderBy: {
                    order_index: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!leaveRequest?.approval_draft?.route?.stages) {
      return [];
    }

    // Transform approval route stages to approver format
    const approvers = [];
    leaveRequest.approval_draft.route.stages.forEach(stage => {
      stage.approvers.forEach(approver => {
        approvers.push({
          id: approver.id,
          user_id: approver.user_id,
          name: approver.user.name,
          email: approver.user.email,
          step: stage.order_index,
          status: approver.status,
          approved_at: approver.acted_at,
          rejected_at: approver.status === 'REJECTED' ? approver.acted_at : null,
          comments: approver.comments,
          notification_sent: true, // Assume notifications are sent
        });
      });
    });

    return approvers;
  }

  /**
   * Get notifications for a user - temporarily disabled
   */
  async getNotifications(userId: string, tenantId: string, unreadOnly = false) {
    // TODO: Implement notifications using modern approval system
    console.log(`Notifications requested for user ${userId} (tenant: ${tenantId}), unread only: ${unreadOnly}`);

    // Return empty array for now - notifications will be implemented later
    return [];
  }

  /**
   * Mark notification as read - temporarily disabled
   */
  async markNotificationRead(notificationId: string, userId: string) {
    // TODO: Implement notification marking using modern approval system
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);

    return { success: true };
  }

  private async updateLeaveBalance(
    tx: any,
    userId: string,
    leaveTypeId: string,
    days: number,
    tenantId: string,
    year: number
  ) {
    const balance = await tx.leave_balances.findFirst({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        leave_type_id: leaveTypeId,
        year: year,
      },
    });

    if (balance) {
      await tx.leave_balances.update({
        where: { id: balance.id },
        data: {
          pending: { decrement: days },
          used: { increment: days },
          updated_at: new Date(),
        },
      });
    }
  }

  private async restoreLeaveBalance(
    tx: any,
    userId: string,
    leaveTypeId: string,
    days: number,
    tenantId: string,
    year: number
  ) {
    const balance = await tx.leave_balances.findFirst({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        leave_type_id: leaveTypeId,
        year: year,
      },
    });

    if (balance) {
      await tx.leave_balances.update({
        where: { id: balance.id },
        data: {
          pending: { decrement: days },
          available: { increment: days },
          updated_at: new Date(),
        },
      });
    }
  }

  private async createNotification(
    tx: any,
    leaveRequestId: string,
    recipientId: string,
    senderId: string,
    type: string,
    title: string,
    message: string
  ) {
    await tx.$executeRaw`
      SELECT create_leave_notification(
        ${leaveRequestId}::VARCHAR,
        ${recipientId}::VARCHAR,
        ${senderId}::VARCHAR,
        ${type}::VARCHAR,
        ${title}::VARCHAR,
        ${message}::TEXT
      )
    `;
  }
}