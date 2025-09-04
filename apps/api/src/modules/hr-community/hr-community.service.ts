import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { NotificationService } from '../../shared/services/notification.service';
import { 
  CreateCommunityPostDto, 
  UpdateCommunityPostDto, 
  GetCommunityPostsQueryDto,
  CreateCommentDto,
  UpdateCommentDto
} from './dto/hr-community.dto';

@Injectable()
export class HrCommunityService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {}

  // ================================
  // COMMUNITY POSTS
  // ================================

  async createPost(companyId: string, authorId: string, dto: CreateCommunityPostDto) {
    const post = await this.prisma.hr_community_post.create({
      data: {
        company_id: companyId,
        author_id: authorId,
        title: dto.title,
        content: dto.content,
        post_type: dto.post_type || 'GENERAL',
        priority: dto.priority || 'NORMAL',
        is_pinned: dto.is_pinned || false,
        allow_comments: dto.allow_comments ?? true,
        target_audience: dto.target_audience || 'ALL',
        department_ids: dto.department_ids || [],
        role_ids: dto.role_ids || [],
        user_ids: dto.user_ids || [],
        tags: dto.tags || [],
        notification_settings: dto.notification_settings || { web_push: true, email: true, app_push: true },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attachments: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            views: true,
          }
        }
      }
    });

    // Send notifications to target audience
    if (dto.post_type !== 'GENERAL' || dto.priority === 'HIGH' || dto.priority === 'URGENT') {
      await this.sendPostNotifications(post);
    }

    return post;
  }

  async findAllPosts(companyId: string, userId: string, query: GetCommunityPostsQueryDto) {
    const {
      search,
      post_type,
      priority,
      tag,
      author_id,
      sort_by = 'created_at',
      order = 'desc',
      page = 1,
      limit = 20
    } = query;

    const where: any = {
      company_id: companyId,
      is_published: true,
    };

    // Check if user can see the post based on target audience
    where.OR = [
      { target_audience: 'ALL' },
      { user_ids: { has: userId } },
      { author_id: userId },
    ];

    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ]
      });
    }

    if (post_type) {
      where.post_type = post_type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (author_id) {
      where.author_id = author_id;
    }

    const orderBy: any = {};
    if (sort_by === 'created_at' || sort_by === 'updated_at') {
      orderBy[sort_by] = order;
    } else {
      // For count-based sorting, we'll sort by the field directly
      orderBy[sort_by] = order;
    }

    // Add pinned posts to the top
    const finalOrderBy = [
      { is_pinned: 'desc' },
      orderBy
    ];

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.hr_community_post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
            }
          },
          attachments: true,
          _count: {
            select: {
              comments: true,
              likes: true,
              views: true,
            }
          },
          likes: {
            where: { user_id: userId },
            select: { id: true }
          }
        },
        orderBy: finalOrderBy,
        skip,
        take: limit,
      }),
      this.prisma.hr_community_post.count({ where }),
    ]);

    // Add isLiked flag
    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      likes: undefined, // Remove the likes array from response
    }));

    return {
      data: postsWithLikeStatus,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findPostById(postId: string, userId?: string) {
    const post = await this.prisma.hr_community_post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attachments: true,
        comments: {
          where: { parent_id: null }, // Only root comments
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar_url: true,
                  }
                }
              },
              orderBy: { created_at: 'asc' }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            views: true,
          }
        },
        likes: userId ? {
          where: { user_id: userId },
          select: { id: true }
        } : false
      }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Record view if user is provided
    if (userId && userId !== post.author_id) {
      await this.recordView(postId, userId);
    }

    return {
      ...post,
      isLiked: userId ? post.likes.length > 0 : false,
      likes: undefined,
    };
  }

  async updatePost(postId: string, userId: string, dto: UpdateCommunityPostDto) {
    const post = await this.prisma.hr_community_post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.author_id !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    return this.prisma.hr_community_post.update({
      where: { id: postId },
      data: {
        title: dto.title,
        content: dto.content,
        post_type: dto.post_type,
        priority: dto.priority,
        is_pinned: dto.is_pinned,
        allow_comments: dto.allow_comments,
        target_audience: dto.target_audience,
        department_ids: dto.department_ids,
        role_ids: dto.role_ids,
        user_ids: dto.user_ids,
        tags: dto.tags,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attachments: true,
        _count: {
          select: {
            comments: true,
            likes: true,
            views: true,
          }
        }
      }
    });
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.hr_community_post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.author_id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.hr_community_post.delete({
      where: { id: postId },
    });

    return { message: 'Post deleted successfully' };
  }

  async recordView(postId: string, userId: string) {
    try {
      await this.prisma.hr_community_view.upsert({
        where: {
          post_id_user_id: {
            post_id: postId,
            user_id: userId,
          }
        },
        update: {
          viewed_at: new Date(),
        },
        create: {
          post_id: postId,
          user_id: userId,
        }
      });

      // Update view count
      await this.prisma.hr_community_post.update({
        where: { id: postId },
        data: {
          view_count: {
            increment: 1,
          }
        }
      });
    } catch (error) {
      console.warn('Failed to record post view:', error.message);
    }
  }

  // ================================
  // LIKES
  // ================================

  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.hr_community_like.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: userId,
        }
      }
    });

    if (existingLike) {
      // Unlike
      await this.prisma.hr_community_like.delete({
        where: { id: existingLike.id }
      });

      await this.prisma.hr_community_post.update({
        where: { id: postId },
        data: { like_count: { decrement: 1 } }
      });

      return { liked: false, message: 'Post unliked' };
    } else {
      // Like
      await this.prisma.hr_community_like.create({
        data: {
          post_id: postId,
          user_id: userId,
        }
      });

      await this.prisma.hr_community_post.update({
        where: { id: postId },
        data: { like_count: { increment: 1 } }
      });

      // Send notification to post author
      const post = await this.prisma.hr_community_post.findUnique({
        where: { id: postId },
        include: { author: true }
      });

      if (post && post.author_id !== userId) {
        const user = await this.prisma.auth_user.findUnique({
          where: { id: userId },
          select: { name: true }
        });

        await this.notificationService.sendCommunityNotification(
          postId,
          [post.author_id],
          'POST_LIKED',
          '게시글 좋아요',
          `${user?.name}님이 회원님의 게시글을 좋아합니다: "${post.title}"`,
          `/hr-community/${postId}`
        );
      }

      return { liked: true, message: 'Post liked' };
    }
  }

  // ================================
  // COMMENTS
  // ================================

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.hr_community_post.findUnique({
      where: { id: postId },
      select: { allow_comments: true, author_id: true, title: true }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.allow_comments) {
      throw new ForbiddenException('Comments are not allowed on this post');
    }

    const comment = await this.prisma.hr_community_comment.create({
      data: {
        post_id: postId,
        author_id: userId,
        parent_id: dto.parent_id,
        content: dto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        }
      }
    });

    // Update comment count
    await this.prisma.hr_community_post.update({
      where: { id: postId },
      data: { comment_count: { increment: 1 } }
    });

    // Send notification to post author (if not the same user)
    if (post.author_id !== userId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      await this.notificationService.sendCommunityNotification(
        postId,
        [post.author_id],
        'COMMENT_ADDED',
        '새 댓글',
        `${user?.name}님이 회원님의 게시글에 댓글을 남겼습니다: "${post.title}"`,
        `/hr-community/${postId}`
      );
    }

    return comment;
  }

  async updateComment(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.hr_community_comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author_id !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.hr_community_comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
        is_edited: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        }
      }
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.hr_community_comment.findUnique({
      where: { id: commentId },
      include: { replies: true }
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Count total comments to be deleted (including replies)
    const totalCommentsToDelete = 1 + comment.replies.length;

    await this.prisma.hr_community_comment.delete({
      where: { id: commentId },
    });

    // Update comment count
    await this.prisma.hr_community_post.update({
      where: { id: comment.post_id },
      data: { comment_count: { decrement: totalCommentsToDelete } }
    });

    return { message: 'Comment deleted successfully' };
  }

  // ================================
  // NOTIFICATION HELPERS
  // ================================

  private async sendPostNotifications(post: any) {
    let recipientIds: string[] = [];

    if (post.target_audience === 'ALL') {
      // Get all users in the company
      const users = await this.prisma.auth_user.findMany({
        where: {
          org_unit: {
            company_id: post.company_id
          }
        },
        select: { id: true }
      });
      recipientIds = users.map(u => u.id).filter(id => id !== post.author_id);
    } else if (post.target_audience === 'SPECIFIC_USERS') {
      recipientIds = post.user_ids || [];
    } else if (post.target_audience === 'DEPARTMENT') {
      // Get users from specific departments
      const users = await this.prisma.auth_user.findMany({
        where: {
          org_id: { in: post.department_ids }
        },
        select: { id: true }
      });
      recipientIds = users.map(u => u.id).filter(id => id !== post.author_id);
    } else if (post.target_audience === 'ROLE') {
      // Get users with specific roles
      const users = await this.prisma.auth_user.findMany({
        where: {
          role: { in: post.role_ids },
          org_unit: {
            company_id: post.company_id
          }
        },
        select: { id: true }
      });
      recipientIds = users.map(u => u.id).filter(id => id !== post.author_id);
    }

    if (recipientIds.length > 0) {
      const notificationTitle = this.getNotificationTitle(post.post_type, post.priority);
      const notificationMessage = `${post.author.name}님이 새 게시글을 작성했습니다: "${post.title}"`;

      await this.notificationService.sendCommunityNotification(
        post.id,
        recipientIds,
        'POST_CREATED',
        notificationTitle,
        notificationMessage,
        `/hr-community/${post.id}`
      );
    }
  }

  private getNotificationTitle(postType: string, priority: string): string {
    if (priority === 'URGENT') return '🚨 긴급 알림';
    if (priority === 'HIGH') return '❗ 중요 알림';
    
    switch (postType) {
      case 'ANNOUNCEMENT': return '📢 새 공지사항';
      case 'POLICY': return '📋 정책 안내';
      case 'CELEBRATION': return '🎉 축하 소식';
      case 'QUESTION': return '❓ 질문';
      default: return '📝 새 게시글';
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  async getAvailableTags(companyId: string) {
    const posts = await this.prisma.hr_community_post.findMany({
      where: {
        company_id: companyId,
        is_published: true,
      },
      select: { tags: true }
    });

    const allTags = posts.flatMap(post => post.tags);
    const uniqueTags = [...new Set(allTags)];
    
    return uniqueTags.sort();
  }

  async getPopularPosts(companyId: string, userId: string, limit: number = 10) {
    const posts = await this.prisma.hr_community_post.findMany({
      where: {
        company_id: companyId,
        is_published: true,
        OR: [
          { target_audience: 'ALL' },
          { user_ids: { has: userId } },
          { author_id: userId },
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            views: true,
          }
        }
      },
      orderBy: [
        { like_count: 'desc' },
        { view_count: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
    });

    return posts;
  }

  async getMyPosts(companyId: string, authorId: string) {
    return this.prisma.hr_community_post.findMany({
      where: {
        company_id: companyId,
        author_id: authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            views: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }
}