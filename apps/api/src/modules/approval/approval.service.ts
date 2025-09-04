import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateApprovalCategoryDto,
  UpdateApprovalCategoryDto,
  CreateApprovalDraftDto,
  UpdateApprovalDraftDto,
  ProcessApprovalDto,
  ApprovalQueryDto,
  ApprovalStatisticsQueryDto,
  ApprovalStatus,
  ApprovalAction,
  RouteStepType
} from './dto/approval.dto';
// Removed UserRole import - using string role checks instead

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  // Category Management
  async createCategory(createDto: CreateApprovalCategoryDto, companyId: string) {
    const category = await this.prisma.approval_category.create({
      data: {
        company_id: companyId,
        name: createDto.name,
        description: createDto.description,
        form_schema: createDto.form_schema,
        is_active: createDto.is_active ?? true,
        auto_approval_limit: createDto.auto_approval_limit,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create default route steps if provided
    if (createDto.default_route && createDto.default_route.length > 0) {
      const routeSteps = createDto.default_route.map(step => ({
        category_id: category.id,
        step_order: step.step_order,
        step_type: step.step_type,
        approver_id: step.approver_id,
        instructions: step.instructions,
        is_required: step.is_required ?? true,
        created_at: new Date()
      }));

      await this.prisma.approval_route_template.createMany({
        data: routeSteps
      });
    }

    return this.getCategory(category.id);
  }

  async updateCategory(id: string, updateDto: UpdateApprovalCategoryDto, companyId: string) {
    const category = await this.prisma.approval_category.findFirst({
      where: { id, company_id: companyId }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    const updatedCategory = await this.prisma.approval_category.update({
      where: { id },
      data: {
        ...updateDto,
        updated_at: new Date()
      }
    });

    // Update route template if provided
    if (updateDto.default_route) {
      // Delete existing route steps
      await this.prisma.approval_route_template.deleteMany({
        where: { category_id: id }
      });

      // Create new route steps
      if (updateDto.default_route.length > 0) {
        const routeSteps = updateDto.default_route.map(step => ({
          category_id: id,
          step_order: step.step_order,
          step_type: step.step_type,
          approver_id: step.approver_id,
          instructions: step.instructions,
          is_required: step.is_required ?? true,
          created_at: new Date()
        }));

        await this.prisma.approval_route_template.createMany({
          data: routeSteps
        });
      }
    }

    return this.getCategory(id);
  }

  async getCategories(companyId: string, includeInactive: boolean = false) {
    const where: any = { company_id: companyId };
    if (!includeInactive) {
      where.is_active = true;
    }

    return this.prisma.approval_category.findMany({
      where,
      include: {
        route_template: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                title: true
              }
            }
          },
          orderBy: { step_order: 'asc' }
        },
        _count: {
          select: {
            drafts: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getCategory(id: string) {
    const category = await this.prisma.approval_category.findUnique({
      where: { id },
      include: {
        route_template: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                title: true
              }
            }
          },
          orderBy: { step_order: 'asc' }
        },
        _count: {
          select: {
            drafts: true
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    return category;
  }

  async deleteCategory(id: string, companyId: string) {
    const category = await this.prisma.approval_category.findFirst({
      where: { id, company_id: companyId }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    // Check if category has any drafts
    const draftCount = await this.prisma.approval_draft.count({
      where: { category_id: id }
    });

    if (draftCount > 0) {
      throw new BadRequestException('Cannot delete category with existing drafts');
    }

    // Delete route template first
    await this.prisma.approval_route_template.deleteMany({
      where: { category_id: id }
    });

    await this.prisma.approval_category.delete({
      where: { id }
    });

    return { message: 'Category deleted successfully' };
  }

  // Draft Management
  async createDraft(createDto: CreateApprovalDraftDto, requesterId: string) {
    const category = await this.prisma.approval_category.findUnique({
      where: { id: createDto.category_id },
      include: {
        route_template: {
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    if (!category.is_active) {
      throw new BadRequestException('Cannot create draft for inactive category');
    }

    const draft = await this.prisma.approval_draft.create({
      data: {
        category_id: createDto.category_id,
        requester_id: requesterId,
        title: createDto.title,
        form_data: createDto.form_data,
        attachments: createDto.attachments || [],
        comments: createDto.comments,
        due_date: createDto.due_date ? new Date(createDto.due_date) : null,
        status: ApprovalStatus.DRAFT,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create approval route steps
    const routeSteps = createDto.custom_route || category.route_template;
    if (routeSteps && routeSteps.length > 0) {
      const approval_steps = routeSteps.map((step, index) => ({
        draft_id: draft.id,
        step_order: step.step_order || index + 1,
        step_type: step.step_type,
        approver_id: step.approver_id,
        instructions: step.instructions,
        is_required: step.is_required ?? true,
        status: 'PENDING',
        created_at: new Date()
      }));

      await this.prisma.approval_step.createMany({
        data: approval_steps
      });
    }

    return this.getDraft(draft.id, requesterId);
  }

  async updateDraft(id: string, updateDto: UpdateApprovalDraftDto, userId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.requester_id !== userId) {
      throw new ForbiddenException('You can only update your own drafts');
    }

    if (draft.status !== ApprovalStatus.DRAFT) {
      throw new BadRequestException('Only draft status documents can be updated');
    }

    const updatedDraft = await this.prisma.approval_draft.update({
      where: { id },
      data: {
        ...updateDto,
        due_date: updateDto.due_date ? new Date(updateDto.due_date) : undefined,
        updated_at: new Date()
      }
    });

    // Update approval route if provided
    if (updateDto.custom_route) {
      // Delete existing steps
      await this.prisma.approval_step.deleteMany({
        where: { draft_id: id }
      });

      // Create new steps
      if (updateDto.custom_route.length > 0) {
        const approval_steps = updateDto.custom_route.map(step => ({
          draft_id: id,
          step_order: step.step_order,
          step_type: step.step_type,
          approver_id: step.approver_id,
          instructions: step.instructions,
          is_required: step.is_required ?? true,
          status: 'PENDING',
          created_at: new Date()
        }));

        await this.prisma.approval_step.createMany({
          data: approval_steps
        });
      }
    }

    return this.getDraft(id, userId);
  }

  async getDrafts(queryDto: ApprovalQueryDto, userId: string, userRole: string) {
    const where: any = {};

    // Handle different view types
    switch (queryDto.view) {
      case 'inbox':
        // Items awaiting user's approval
        where.approval_steps = {
          some: {
            approver_id: userId,
            status: 'PENDING',
            step_order: {
              lte: await this.getCurrentStepOrder(userId)
            }
          }
        };
        break;
      case 'outbox':
        // User's own requests
        where.requester_id = userId;
        break;
      case 'drafts':
        // User's draft documents
        where.requester_id = userId;
        where.status = ApprovalStatus.DRAFT;
        break;
      default:
        // All - admin only, otherwise user's own
        if (userRole !== 'HR_ADMIN') {
          where.OR = [
            { requester_id: userId },
            {
              approval_steps: {
                some: { approver_id: userId }
              }
            }
          ];
        }
    }

    // Apply filters
    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.category_id) {
      where.category_id = queryDto.category_id;
    }

    if (queryDto.requester_id && userRole === 'HR_ADMIN') {
      where.requester_id = queryDto.requester_id;
    }

    if (queryDto.start_date) {
      where.created_at = { gte: new Date(queryDto.start_date) };
    }

    if (queryDto.end_date) {
      where.created_at = { 
        ...where.created_at,
        lte: new Date(queryDto.end_date) 
      };
    }

    if (queryDto.search) {
      where.OR = [
        { title: { contains: queryDto.search, mode: 'insensitive' } },
        { comments: { contains: queryDto.search, mode: 'insensitive' } }
      ];
    }

    const [drafts, total] = await Promise.all([
      this.prisma.approval_draft.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              form_schema: true
            }
          },
          requester: {
            select: {
              id: true,
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
          approval_steps: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { step_order: 'asc' }
          },
          _count: {
            select: {
              approval_steps: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (queryDto.page - 1) * queryDto.limit,
        take: queryDto.limit
      }),
      this.prisma.approval_draft.count({ where })
    ]);

    return {
      data: drafts,
      pagination: {
        total,
        page: queryDto.page,
        limit: queryDto.limit,
        totalPages: Math.ceil(total / queryDto.limit)
      }
    };
  }

  async getDraft(id: string, userId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            form_schema: true,
            auto_approval_limit: true
          }
        },
        requester: {
          select: {
            id: true,
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
        approval_steps: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                title: true
              }
            }
          },
          orderBy: { step_order: 'asc' }
        }
      }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    // Check access permissions
    const hasAccess = draft.requester_id === userId || 
                     draft.approval_steps.some(step => step.approver_id === userId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this draft');
    }

    return draft;
  }

  async submitDraft(id: string, userId: string) {
    const draft = await this.getDraft(id, userId);

    if (draft.requester_id !== userId) {
      throw new ForbiddenException('You can only submit your own drafts');
    }

    if (draft.status !== ApprovalStatus.DRAFT) {
      throw new BadRequestException('Only draft status documents can be submitted');
    }

    // Check if there are approval steps
    const approval_steps = await this.prisma.approval_step.findMany({
      where: { draft_id: id },
      orderBy: { step_order: 'asc' }
    });

    if (approval_steps.length === 0) {
      // No approval steps - auto approve
      await this.prisma.approval_draft.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          submitted_at: new Date(),
          updated_at: new Date()
        }
      });
    } else {
      // Start approval process
      await this.prisma.approval_draft.update({
        where: { id },
        data: {
          status: ApprovalStatus.PENDING,
          submitted_at: new Date(),
          updated_at: new Date()
        }
      });

      // Send email notification to first approver
      try {
        const firstApprover = approval_steps.find(step => step.step_order === 1);
        if (firstApprover) {
          const approverData = await this.prisma.auth_user.findUnique({
            where: { id: firstApprover.approver_id }
          });

          if (approverData) {
            await this.emailService.sendApprovalRequestEmail(
              approverData.email,
              {
                requestorName: draft.requester.name,
                approverName: approverData.name,
                documentTitle: draft.title,
                documentType: draft.category.name,
                requestedAt: new Date(),
                approvalUrl: `${process.env.CLIENT_URL || 'http://localhost:3001'}/approval/inbox/${id}`
              }
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send approval request email:', emailError);
      }
    }

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: userId,
        action: 'SUBMIT_APPROVAL_DRAFT',
        entity_type: 'approval_draft',
        entity_id: id,
        changes: { submitted: true },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return this.getDraft(id, userId);
  }

  async processApproval(id: string, processDto: ProcessApprovalDto, approverId: string) {
    const draft = await this.getDraft(id, approverId);

    // Find current approval step
    const currentStep = draft.approval_steps.find(
      step => step.approver_id === approverId && step.status === 'PENDING'
    );

    if (!currentStep) {
      throw new BadRequestException('No pending approval step found for this user');
    }

    // Process the action
    let newStatus = draft.status;
    let newStepStatus = 'PENDING';

    switch (processDto.action) {
      case ApprovalAction.APPROVE:
        newStepStatus = 'APPROVED';
        // Check if this is the last required step
        const remainingSteps = draft.approval_steps.filter(
          step => step.is_required && 
                 step.status === 'PENDING' && 
                 step.step_order > currentStep.step_order
        );
        if (remainingSteps.length === 0) {
          newStatus = ApprovalStatus.APPROVED;
        }
        break;

      case ApprovalAction.REJECT:
        newStepStatus = 'REJECTED';
        newStatus = ApprovalStatus.REJECTED;
        break;

      case ApprovalAction.RETURN:
        newStepStatus = 'RETURNED';
        newStatus = ApprovalStatus.RETURNED;
        break;

      case ApprovalAction.FORWARD:
        if (!processDto.forward_to_user_id) {
          throw new BadRequestException('Forward to user ID is required for FORWARD action');
        }
        // Update the current step to point to new approver
        await this.prisma.approval_step.update({
          where: { id: currentStep.id },
          data: {
            approver_id: processDto.forward_to_user_id,
            instructions: processDto.forward_instructions,
            updated_at: new Date()
          }
        });
        break;

      default:
        throw new BadRequestException('Invalid approval action');
    }

    // Update the step
    if (processDto.action !== ApprovalAction.FORWARD) {
      await this.prisma.approval_step.update({
        where: { id: currentStep.id },
        data: {
          status: newStepStatus,
          processed_at: new Date(),
          comments: processDto.comments,
          approval_data: processDto.approval_data,
          updated_at: new Date()
        }
      });
    }

    // Update the draft status
    await this.prisma.approval_draft.update({
      where: { id },
      data: {
        status: newStatus,
        updated_at: new Date()
      }
    });

    // Send email notification based on action
    try {
      const approverData = await this.prisma.auth_user.findUnique({
        where: { id: approverId }
      });

      if (processDto.action === ApprovalAction.APPROVE || processDto.action === ApprovalAction.REJECT) {
        // Final approval/rejection - notify requester
        if (newStatus === ApprovalStatus.APPROVED || newStatus === ApprovalStatus.REJECTED) {
          await this.emailService.sendApprovalCompletionEmail(
            draft.requester.email,
            {
              requestorName: draft.requester.name,
              approverName: approverData?.name || 'Unknown',
              documentTitle: draft.title,
              documentType: draft.category.name,
              status: newStatus === ApprovalStatus.APPROVED ? 'APPROVED' : 'REJECTED',
              completedAt: new Date(),
              comments: processDto.comments
            }
          );
        } else if (processDto.action === ApprovalAction.APPROVE) {
          // Not final step - notify next approver
          const nextApprover = draft.approval_steps.find(
            step => step.step_order > currentStep.step_order && 
                   step.status === 'PENDING' && 
                   step.is_required
          );

          if (nextApprover) {
            const nextApproverData = await this.prisma.auth_user.findUnique({
              where: { id: nextApprover.approver_id }
            });

            if (nextApproverData) {
              await this.emailService.sendApprovalRequestEmail(
                nextApproverData.email,
                {
                  requestorName: draft.requester.name,
                  approverName: nextApproverData.name,
                  documentTitle: draft.title,
                  documentType: draft.category.name,
                  requestedAt: new Date(),
                  approvalUrl: `${process.env.CLIENT_URL || 'http://localhost:3001'}/approval/inbox/${id}`
                }
              );
            }
          }
        }
      } else if (processDto.action === ApprovalAction.FORWARD) {
        // Forward to another approver - notify new approver
        const newApproverData = await this.prisma.auth_user.findUnique({
          where: { id: processDto.forward_to_user_id }
        });

        if (newApproverData) {
          await this.emailService.sendApprovalRequestEmail(
            newApproverData.email,
            {
              requestorName: draft.requester.name,
              approverName: newApproverData.name,
              documentTitle: draft.title,
              documentType: draft.category.name,
              requestedAt: new Date(),
              approvalUrl: `${process.env.CLIENT_URL || 'http://localhost:3001'}/approval/inbox/${id}`
            }
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send approval notification email:', emailError);
    }

    // Log audit trail
    await this.prisma.audit_log.create({
      data: {
        user_id: approverId,
        action: `APPROVAL_${processDto.action}`,
        entity_type: 'approval_draft',
        entity_id: id,
        changes: { 
          action: processDto.action, 
          comments: processDto.comments,
          step_id: currentStep.id
        },
        ip_address: 'system',
        user_agent: 'system'
      }
    });

    return this.getDraft(id, approverId);
  }

  async deleteDraft(id: string, userId: string) {
    const draft = await this.getDraft(id, userId);

    if (draft.requester_id !== userId) {
      throw new ForbiddenException('You can only delete your own drafts');
    }

    if (draft.status !== ApprovalStatus.DRAFT) {
      throw new BadRequestException('Only draft status documents can be deleted');
    }

    // Delete approval steps first
    await this.prisma.approval_step.deleteMany({
      where: { draft_id: id }
    });

    // Delete the draft
    await this.prisma.approval_draft.delete({
      where: { id }
    });

    return { message: 'Draft deleted successfully' };
  }

  async getApprovalStatistics(queryDto: ApprovalStatisticsQueryDto, companyId: string) {
    const periodFilter = this.getPeriodFilter(queryDto.period);
    const whereClause: any = {
      created_at: periodFilter,
      requester: {
        company_id: companyId
      }
    };

    if (queryDto.category_id) {
      whereClause.category_id = queryDto.category_id;
    }

    if (queryDto.user_id) {
      whereClause.requester_id = queryDto.user_id;
    }

    const [totalDrafts, approvedDrafts, pendingDrafts, rejectedDrafts] = await Promise.all([
      this.prisma.approval_draft.count({ where: whereClause }),
      this.prisma.approval_draft.count({ 
        where: { ...whereClause, status: ApprovalStatus.APPROVED } 
      }),
      this.prisma.approval_draft.count({ 
        where: { ...whereClause, status: ApprovalStatus.PENDING } 
      }),
      this.prisma.approval_draft.count({ 
        where: { ...whereClause, status: ApprovalStatus.REJECTED } 
      })
    ]);

    // Get statistics by category
    const categoryStats = await this.prisma.approval_draft.groupBy({
      by: ['category_id'],
      where: whereClause,
      _count: { id: true }
    });

    const categoryDetails = await this.prisma.approval_category.findMany({
      where: {
        id: { in: categoryStats.map(stat => stat.category_id) }
      },
      select: {
        id: true,
        name: true
      }
    });

    const categoryStatsWithNames = categoryStats.map(stat => ({
      categoryId: stat.category_id,
      categoryName: categoryDetails.find(cat => cat.id === stat.category_id)?.name || 'Unknown',
      count: stat._count.id
    }));

    return {
      summary: {
        total: totalDrafts,
        approved: approvedDrafts,
        pending: pendingDrafts,
        rejected: rejectedDrafts,
        approvalRate: totalDrafts > 0 ? (approvedDrafts / totalDrafts * 100).toFixed(1) : 0
      },
      byCategory: categoryStatsWithNames
    };
  }

  private async getCurrentStepOrder(userId: string): Promise<number> {
    // This would return the current step order for pending approvals
    // For simplicity, returning a high number to get all pending steps
    return 999;
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