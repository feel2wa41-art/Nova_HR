import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import {
  CreateApprovalCategoryDto,
  UpdateApprovalCategoryDto,
  CreateApprovalDraftDto,
  UpdateApprovalDraftDto,
  ProcessApprovalDto,
  ApprovalStatisticsQueryDto,
  ApprovalStatus
} from './dto/approval.dto';

@Injectable()
export class ApprovalService {
  constructor(private prisma: PrismaService) {}

  // Simplified methods for basic functionality
  async createCategory(createDto: CreateApprovalCategoryDto, companyId: string) {
    return this.prisma.approval_category.create({
      data: {
        company_id: companyId,
        name: createDto.name,
        code: createDto.name.toLowerCase().replace(/\s+/g, '_'),
        description: createDto.description,
        form_schema: createDto.form_schema,
        is_active: createDto.is_active ?? true
      }
    });
  }

  async getCategories(companyId: string, includeInactive: boolean = false) {
    const where: any = { company_id: companyId };
    if (!includeInactive) {
      where.is_active = true;
    }
    return this.prisma.approval_category.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async getCategory(id: string, tenantId: string) {
    const category = await this.prisma.approval_category.findUnique({
      where: { 
        id,
        OR: [
          { company_id: tenantId },  // Tenant-specific category
          { company_id: null }       // Global/system category
        ]
      }
    });
    
    if (!category) {
      throw new NotFoundException('Approval category not found');
    }
    
    return category;
  }

  async createDraft(createDto: CreateApprovalDraftDto, requesterId: string, tenantId: string) {
    // Verify user belongs to tenant and category exists
    const user = await this.prisma.auth_user.findUnique({
      where: { id: requesterId, tenant_id: tenantId }
    });
    if (!user) {
      throw new NotFoundException('User not found or access denied');
    }

    const category = await this.getCategory(createDto.category_id, tenantId);
    if (!category) {
      throw new NotFoundException('Category not found or access denied');
    }

    return this.prisma.approval_draft.create({
      data: {
        user_id: requesterId,
        category_id: createDto.category_id,
        title: createDto.title,
        description: createDto.title,
        content: createDto.form_data || {},
        status: 'DRAFT'
      }
    });
  }

  async getDrafts(queryDto: any, userId: string, tenantId: string, userRole?: string) {
    let where: any = {
      user: { tenant_id: tenantId }  // Critical tenant isolation security check
    };

    // Handle different views
    if (queryDto?.view === 'inbox') {
      // For inbox: show items that need approval from current user (within same tenant)
      // Find drafts where the user is assigned as an approver in pending/in-review status
      const approverDrafts = await this.prisma.approval_draft.findMany({
        where: {
          status: { in: ['PENDING', 'IN_REVIEW'] },
          user_id: { not: userId },
          user: { tenant_id: tenantId },  // Tenant isolation security check
          route: {
            stages: {
              some: {
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                approvers: {
                  some: {
                    user_id: userId,
                    status: 'PENDING'
                  }
                }
              }
            }
          }
        },
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
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
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return approverDrafts;
    } else if (queryDto?.view === 'outbox') {
      // For outbox: show user's submitted items (any status except draft)
      where = {
        user_id: userId,
        status: { not: 'DRAFT' }
      };
    } else if (queryDto?.view === 'drafts') {
      // For drafts: show user's draft items only
      where = {
        user_id: userId,
        status: 'DRAFT'
      };
    } else {
      // Default: show user's own items
      where = { user_id: userId };
    }

    // Apply status filter if specified
    if (queryDto?.status && !queryDto?.view) {
      where.status = queryDto.status;
    }

    return this.prisma.approval_draft.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getDraft(id: string, userId: string, tenantId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id },
      include: {
        category: true,
        user: true
      }
    });

    if (!draft || !draft.user || draft.user.tenant_id !== tenantId) {
      throw new NotFoundException('Draft not found or access denied');
    }

    return draft;
  }

  // Placeholder methods to satisfy controller dependencies
  async updateCategory(id: string, updateDto: UpdateApprovalCategoryDto, companyId: string) {
    const category = await this.prisma.approval_category.findUnique({
      where: { id, company_id: companyId }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    return this.prisma.approval_category.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        form_schema: updateDto.form_schema,
        is_active: updateDto.is_active
      }
    });
  }

  async deleteCategory(id: string, companyId: string) {
    const category = await this.prisma.approval_category.findUnique({
      where: { id, company_id: companyId }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    // Check if there are any drafts using this category
    const draftsCount = await this.prisma.approval_draft.count({
      where: { category_id: id }
    });

    if (draftsCount > 0) {
      // Soft delete - mark as inactive instead of hard delete
      await this.prisma.approval_category.update({
        where: { id },
        data: { is_active: false }
      });
      return { success: true, message: 'Category deactivated (has associated drafts)' };
    } else {
      // Hard delete if no associated drafts
      await this.prisma.approval_category.delete({
        where: { id }
      });
      return { success: true, message: 'Category deleted' };
    }
  }

  async updateDraft(id: string, updateDto: UpdateApprovalDraftDto, userId: string, tenantId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id, user_id: userId },
      include: {
        user: true
      }
    });

    if (!draft || !draft.user || draft.user.tenant_id !== tenantId) {
      throw new NotFoundException('Draft not found or access denied');
    }

    // Only allow updates for drafts in DRAFT status
    if (draft.status !== 'DRAFT') {
      throw new NotFoundException('Only draft status documents can be updated');
    }

    return this.prisma.approval_draft.update({
      where: { id },
      data: {
        title: updateDto.title,
        description: updateDto.title, // Use title as description for consistency
        content: updateDto.form_data || draft.content
      }
    });
  }

  async submitDraft(id: string, userId: string, tenantId: string) {
    // Verify user owns the draft and belongs to tenant
    const draft = await this.getDraft(id, userId, tenantId);
    if (draft.user_id !== userId) {
      throw new NotFoundException('Draft not found or access denied');
    }

    return this.prisma.approval_draft.update({
      where: { id },
      data: { status: 'PENDING', submitted_at: new Date() }
    });
  }

  async processApproval(id: string, processDto: ProcessApprovalDto, approverId: string, tenantId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id },
      include: {
        category: true,
        user: true
      }
    });

    if (!draft || !draft.user || draft.user.tenant_id !== tenantId) {
      throw new NotFoundException('Approval request not found or access denied');
    }

    // Verify approver belongs to the same tenant
    const approver = await this.prisma.auth_user.findUnique({
      where: { id: approverId, tenant_id: tenantId }
    });
    if (!approver) {
      throw new NotFoundException('Approver not found or access denied');
    }

    // Only process drafts that are in progress
    if (!['IN_REVIEW', 'PENDING'].includes(draft.status)) {
      throw new NotFoundException('This approval request cannot be processed');
    }

    const updateData: any = {
      status: processDto.action.toUpperCase() as ApprovalStatus,
      processed_at: new Date(),
      processed_by: approverId,
      comments: processDto.comments
    };

    // Set final status based on action
    switch (processDto.action.toLowerCase()) {
      case 'approve':
        updateData.status = 'APPROVED';
        break;
      case 'reject':
        updateData.status = 'REJECTED';
        break;
      case 'return':
        updateData.status = 'RETURNED';
        break;
      case 'forward':
        updateData.status = 'IN_REVIEW';
        // In a full implementation, we would handle forwarding to another approver
        break;
      default:
        throw new NotFoundException('Invalid approval action');
    }

    const updatedDraft = await this.prisma.approval_draft.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      message: `Approval request ${processDto.action.toLowerCase()}ed successfully`,
      draft: updatedDraft
    };
  }

  async deleteDraft(id: string, userId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id, user_id: userId }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found or access denied');
    }

    // Only allow deletion of drafts in DRAFT status
    if (draft.status !== 'DRAFT') {
      throw new NotFoundException('Only draft status documents can be deleted');
    }

    await this.prisma.approval_draft.delete({
      where: { id }
    });

    return { success: true, message: 'Draft deleted successfully' };
  }

  async getCount(type: string, userId: string, userRole?: string) {
    const baseWhere: any = {};
    
    switch (type) {
      case 'drafts':
        baseWhere.user_id = userId;
        baseWhere.status = 'DRAFT';
        break;
        
      case 'inbox':
        // For inbox, count items that need approval from current user
        // Use the same logic as getDrafts inbox view
        const inboxCount = await this.prisma.approval_draft.count({
          where: {
            status: { in: ['PENDING', 'IN_REVIEW'] },
            user_id: { not: userId },
            route: {
              stages: {
                some: {
                  status: { in: ['PENDING', 'IN_PROGRESS'] },
                  approvers: {
                    some: {
                      user_id: userId,
                      status: 'PENDING'
                    }
                  }
                }
              }
            }
          }
        });
        
        return { count: inboxCount };
        
      case 'pending':
        baseWhere.user_id = userId;
        baseWhere.status = { in: ['PENDING', 'IN_REVIEW'] };
        break;
        
      case 'outbox':
        // Items submitted by the user (any status except draft)
        baseWhere.user_id = userId;
        baseWhere.status = { not: 'DRAFT' };
        break;
        
      case 'reference':
        // For reference documents, typically approved items for viewing
        // In a full implementation, this would check reference permissions
        baseWhere.status = 'APPROVED';
        if (userRole !== 'HR_ADMIN' && userRole !== 'HR_MANAGER') {
          baseWhere.user_id = userId;
        }
        break;
        
      default:
        return { count: 0 };
    }

    const count = await this.prisma.approval_draft.count({
      where: baseWhere
    });

    return { count };
  }

  async getApprovalStatistics(query: ApprovalStatisticsQueryDto, companyId: string) {
    const whereClause: any = {
      category: {
        company_id: companyId
      }
    };

    // Add category filter if provided
    if (query.category_id) {
      whereClause.category_id = query.category_id;
    }

    // Add user filter if provided
    if (query.user_id) {
      whereClause.user_id = query.user_id;
    }

    // Add date filter based on period
    const now = new Date();
    let startDate: Date;
    
    switch (query.period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default: // month
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }
    
    whereClause.created_at = {
      gte: startDate
    };

    // Get total count
    const total = await this.prisma.approval_draft.count({ where: whereClause });

    // Get status-specific counts
    const [pending, approved, rejected, inReview, returned, draft] = await Promise.all([
      this.prisma.approval_draft.count({ where: { ...whereClause, status: 'PENDING' } }),
      this.prisma.approval_draft.count({ where: { ...whereClause, status: 'APPROVED' } }),
      this.prisma.approval_draft.count({ where: { ...whereClause, status: 'REJECTED' } }),
      this.prisma.approval_draft.count({ where: { ...whereClause, status: 'IN_REVIEW' } }),
      this.prisma.approval_draft.count({ where: { ...whereClause, status: 'RETURNED' } }),
      this.prisma.approval_draft.count({ where: { ...whereClause, status: 'DRAFT' } })
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      inReview,
      returned,
      draft,
      percentages: total > 0 ? {
        pending: Math.round((pending / total) * 100),
        approved: Math.round((approved / total) * 100),
        rejected: Math.round((rejected / total) * 100),
        inReview: Math.round((inReview / total) * 100),
        returned: Math.round((returned / total) * 100),
        draft: Math.round((draft / total) * 100)
      } : null
    };
  }
}