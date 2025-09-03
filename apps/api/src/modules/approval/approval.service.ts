import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(userId: string, data: {
    title: string;
    category_id: string;
    content: any;
    attachments?: string[];
  }) {
    const category = await this.prisma.approval_category.findUnique({
      where: { id: data.category_id }
    });

    if (!category) {
      throw new NotFoundException('Approval category not found');
    }

    const draft = await this.prisma.approval_draft.create({
      data: {
        title: data.title,
        content: data.content,
        category_id: data.category_id,
        user_id: userId,
        status: 'DRAFT',
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return draft;
  }

  async submitDraft(userId: string, draftId: string, routeData: {
    approvers: Array<{ user_id: string; step: number; type: 'APPROVE' | 'REVIEW' }>;
    reviewers?: Array<{ user_id: string; step: number }>;
    references?: Array<{ user_id: string }>;
  }) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id: draftId },
      include: { user: true }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.user_id !== userId) {
      throw new ForbiddenException('Not authorized to submit this draft');
    }

    if (draft.status !== 'DRAFT') {
      throw new BadRequestException('Draft is already submitted');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.approval_draft.update({
        where: { id: draftId },
        data: { 
          status: 'PENDING',
          submitted_at: new Date()
        }
      });


      // Create approval route stages and approvers based on the data structure
      const route = await tx.approval_route.create({
        data: {
          draft_id: draftId,
        }
      });

      // Group approvers by step to create stages
      const stagesByStep = new Map();
      for (const approver of routeData.approvers) {
        if (!stagesByStep.has(approver.step)) {
          stagesByStep.set(approver.step, []);
        }
        stagesByStep.get(approver.step).push(approver);
      }

      // Create stages and approvers
      for (const [step, stepApprovers] of stagesByStep) {
        const stage = await tx.approval_route_stage.create({
          data: {
            route_id: route.id,
            type: 'APPROVAL',
            mode: 'SEQUENTIAL',
            order_index: step,
            status: step === 1 ? 'IN_PROGRESS' : 'PENDING',
          }
        });

        for (let i = 0; i < stepApprovers.length; i++) {
          await tx.approval_route_approver.create({
            data: {
              stage_id: stage.id,
              user_id: stepApprovers[i].user_id,
              order_index: i,
              status: step === 1 ? 'PENDING' : 'PENDING',
            }
          });
        }
      }
    });

    return { message: 'Draft submitted successfully' };
  }

  async getDrafts(userId: string, type: 'my' | 'inbox' | 'outbox' = 'my') {
    let where: any = {};

    switch (type) {
      case 'my':
        where = { user_id: userId };
        break;
      case 'inbox':
        where = {
          route: {
            stages: {
              some: {
                approvers: {
                  some: {
                    user_id: userId,
                    status: 'PENDING',
                  }
                }
              }
            }
          }
        };
        break;
      case 'outbox':
        where = {
          route: {
            stages: {
              some: {
                approvers: {
                  some: {
                    user_id: userId,
                    status: { in: ['APPROVED', 'REJECTED'] },
                  }
                }
              }
            }
          }
        };
        break;
    }

    return this.prisma.approval_draft.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
                        email: true,
                      }
                    }
                  }
                }
              },
              orderBy: { order_index: 'asc' }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getDraft(userId: string, draftId: string) {
    const draft = await this.prisma.approval_draft.findUnique({
      where: { id: draftId },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
                        email: true,
                      }
                    }
                  }
                }
              },
              orderBy: { order_index: 'asc' }
            }
          }
        }
      }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    const hasAccess = draft.user_id === userId || 
      (draft.route?.stages.some(stage => 
        stage.approvers.some(approver => approver.user_id === userId)
      ) ?? false);

    if (!hasAccess) {
      throw new ForbiddenException('Not authorized to view this draft');
    }

    return draft;
  }

  async processApproval(userId: string, draftId: string, action: 'APPROVE' | 'REJECT', comment?: string) {
    const approver = await this.prisma.approval_route_approver.findFirst({
      where: {
        user_id: userId,
        status: 'PENDING',
        stage: {
          route: {
            draft_id: draftId
          }
        }
      },
      include: {
        stage: {
          include: {
            route: {
              include: {
                draft: true
              }
            }
          }
        }
      }
    });

    if (!approver) {
      throw new NotFoundException('No pending approval found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.approval_route_approver.update({
        where: { id: approver.id },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          acted_at: new Date(),
          comments: comment,
        }
      });

      if (action === 'REJECT') {
        await tx.approval_draft.update({
          where: { id: draftId },
          data: { status: 'REJECTED' }
        });
      } else {
        // Check if all approvers in this stage are done
        const stageApprovers = await tx.approval_route_approver.findMany({
          where: { stage_id: approver.stage_id }
        });
        
        const allApproved = stageApprovers.every(ap => 
          ap.id === approver.id ? true : ap.status === 'APPROVED'
        );

        if (allApproved) {
          // Mark stage as completed
          await tx.approval_route_stage.update({
            where: { id: approver.stage_id },
            data: { status: 'COMPLETED' }
          });

          // Find next stage
          const nextStage = await tx.approval_route_stage.findFirst({
            where: {
              route_id: approver.stage.route_id,
              order_index: { gt: approver.stage.order_index },
              status: 'PENDING'
            }
          });

          if (nextStage) {
            await tx.approval_route_stage.update({
              where: { id: nextStage.id },
              data: { status: 'IN_PROGRESS' }
            });
          } else {
            await tx.approval_draft.update({
              where: { id: draftId },
              data: { 
                status: 'APPROVED',
                completed_at: new Date()
              }
            });
          }
        }
      }
    });

    return { message: `Draft ${action.toLowerCase()}d successfully` };
  }

  async getCategories() {
    return this.prisma.approval_category.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getStatistics(userId: string) {
    const [myDrafts, pendingApprovals, totalProcessed] = await Promise.all([
      this.prisma.approval_draft.count({
        where: { user_id: userId }
      }),
      this.prisma.approval_route_approver.count({
        where: {
          user_id: userId,
          status: 'PENDING'
        }
      }),
      this.prisma.approval_route_approver.count({
        where: {
          user_id: userId,
          status: { in: ['APPROVED', 'REJECTED'] }
        }
      })
    ]);

    return {
      myDrafts,
      pendingApprovals,
      totalProcessed
    };
  }
}