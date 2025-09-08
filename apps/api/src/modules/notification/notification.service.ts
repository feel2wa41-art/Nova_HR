import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  addDays, 
  isAfter, 
  isBefore 
} from 'date-fns';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    metadata?: any;
    tenantId?: string;
  }) {
    // Verify user belongs to tenant if tenantId is provided
    if (data.tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: data.user_id, tenant_id: data.tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type || 'GENERAL',
        metadata: data.metadata || {},
      },
    });
  }

  async getNotifications(userId: string, limit = 50, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        status: 'READ',
        read_at: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        read_at: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.count({
      where: {
        user_id: userId,
        status: 'UNREAD',
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });
  }

  // Enhanced notification methods
  async createBulkNotification(data: {
    userIds: string[];
    title: string;
    message: string;
    type?: string;
    metadata?: any;
  }) {
    const notifications = data.userIds.map(userId => ({
      user_id: userId,
      title: data.title,
      message: data.message,
      type: data.type || 'GENERAL',
      metadata: data.metadata || {},
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async createCompanyNotification(companyId: string, tenantId: string, data: {
    title: string;
    message: string;
    type?: string;
    metadata?: any;
    roles?: string[];
    departments?: string[];
  }) {
    // Verify company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenant_id: tenantId }
    });
    if (!company) {
      throw new Error('Company not found or access denied');
    }
    // Get users based on filters
    const whereClause: any = {
      tenant_id: tenantId,  // Tenant isolation security check
      status: 'ACTIVE',
    };

    if (data.roles && data.roles.length > 0) {
      whereClause.role = { in: data.roles };
    }

    if (data.departments && data.departments.length > 0) {
      whereClause.employee_profile = {
        department: { in: data.departments },
      };
    }

    const users = await this.prisma.auth_user.findMany({
      where: whereClause,
      select: { id: true },
    });

    const userIds = users.map(user => user.id);

    if (userIds.length > 0) {
      return this.createBulkNotification({
        userIds,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata,
      });
    }

    return { count: 0 };
  }

  async getNotificationsByType(userId: string, type: string, limit = 20, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    return this.prisma.notification.findMany({
      where: {
        user_id: userId,
        type: type,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getNotificationSettings(userId: string, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    // Return default settings since notification_settings table doesn't exist yet
    return {
      user_id: userId,
      email_enabled: true,
      push_enabled: true,
      attendance_reminders: true,
      approval_notifications: true,
      system_announcements: true,
      productivity_reports: false,
    };
  }

  async updateNotificationSettings(userId: string, settings: {
    email_enabled?: boolean;
    push_enabled?: boolean;
    attendance_reminders?: boolean;
    approval_notifications?: boolean;
    system_announcements?: boolean;
    productivity_reports?: boolean;
  }, tenantId?: string) {
    // Verify user belongs to tenant if tenantId is provided
    if (tenantId) {
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId, tenant_id: tenantId }
      });
      if (!user) {
        throw new Error('User not found or access denied');
      }
    }
    // Return updated settings since notification_settings table doesn't exist yet
    return {
      user_id: userId,
      email_enabled: settings.email_enabled ?? true,
      push_enabled: settings.push_enabled ?? true,
      attendance_reminders: settings.attendance_reminders ?? true,
      approval_notifications: settings.approval_notifications ?? true,
      system_announcements: settings.system_announcements ?? true,
      productivity_reports: settings.productivity_reports ?? false,
    };
  }

  // System notification types
  async sendAttendanceReminder(userId: string, type: 'check_in' | 'check_out') {
    const settings = await this.getNotificationSettings(userId);
    
    if (!settings.attendance_reminders) {
      return null;
    }

    const messages = {
      check_in: {
        title: 'Check-in Reminder',
        message: 'Don\'t forget to check in for today!',
      },
      check_out: {
        title: 'Check-out Reminder', 
        message: 'Remember to check out before leaving work.',
      },
    };

    return this.createNotification({
      user_id: userId,
      title: messages[type].title,
      message: messages[type].message,
      type: 'ATTENDANCE_REMINDER',
      metadata: { reminderType: type },
    });
  }

  async sendApprovalNotification(userId: string, data: {
    approvalId: string;
    approvalTitle: string;
    action: 'submitted' | 'approved' | 'rejected' | 'pending_action';
    actionBy?: string;
  }) {
    const settings = await this.getNotificationSettings(userId);
    
    if (!settings.approval_notifications) {
      return null;
    }

    const messages = {
      submitted: {
        title: 'Approval Request Submitted',
        message: `Your request "${data.approvalTitle}" has been submitted for approval.`,
      },
      approved: {
        title: 'Approval Request Approved',
        message: `Your request "${data.approvalTitle}" has been approved.`,
      },
      rejected: {
        title: 'Approval Request Rejected',
        message: `Your request "${data.approvalTitle}" has been rejected.`,
      },
      pending_action: {
        title: 'Approval Action Required',
        message: `You have a pending approval request: "${data.approvalTitle}".`,
      },
    };

    return this.createNotification({
      user_id: userId,
      title: messages[data.action].title,
      message: messages[data.action].message,
      type: 'APPROVAL_NOTIFICATION',
      metadata: {
        approvalId: data.approvalId,
        action: data.action,
        actionBy: data.actionBy,
      },
    });
  }

  async sendProductivityReport(userId: string, data: {
    period: string;
    score: number;
    activeTime: number;
    improvements?: string[];
  }) {
    const settings = await this.getNotificationSettings(userId);
    
    if (!settings.productivity_reports) {
      return null;
    }

    return this.createNotification({
      user_id: userId,
      title: `${data.period} Productivity Report`,
      message: `Your productivity score: ${data.score}%. Active time: ${Math.round(data.activeTime / 60)}h`,
      type: 'PRODUCTIVITY_REPORT',
      metadata: data,
    });
  }

  async sendSystemAnnouncement(companyId: string, tenantId: string, data: {
    title: string;
    message: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    expiresAt?: Date;
  }) {
    return this.createCompanyNotification(companyId, tenantId, {
      title: data.title,
      message: data.message,
      type: 'SYSTEM_ANNOUNCEMENT',
      metadata: {
        priority: data.priority || 'normal',
        expiresAt: data.expiresAt,
      },
    });
  }

  // Scheduled notification jobs
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyAttendanceReminders() {
    console.log('Sending daily attendance reminders...');

    try {
      // Get all active users who haven't checked in today
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const usersWithoutCheckIn = await this.prisma.auth_user.findMany({
        where: {
          status: 'ACTIVE',
          attendance: {
            none: {
              date_key: {
                gte: startOfToday,
                lte: endOfToday,
              },
              status: 'NORMAL',
            },
          },
        },
        select: { id: true },
      });

      // Send reminders
      const reminderPromises = usersWithoutCheckIn.map(user =>
        this.sendAttendanceReminder(user.id, 'check_in')
      );

      await Promise.all(reminderPromises);
      
      console.log(`Sent ${usersWithoutCheckIn.length} check-in reminders`);
    } catch (error) {
      console.error('Failed to send daily attendance reminders:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async sendDailyCheckOutReminders() {
    console.log('Sending daily check-out reminders...');

    try {
      // Get users who checked in today but haven't checked out
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const usersWithoutCheckOut = await this.prisma.auth_user.findMany({
        where: {
          status: 'ACTIVE',
          attendance: {
            some: {
              AND: [
                {
                  date_key: {
                    gte: startOfToday,
                    lte: endOfToday,
                  },
                },
                {
                  status: 'NORMAL',
                },
                {
                  check_out_at: null,
                },
              ],
            },
          },
        },
        select: { id: true },
      });

      // Send reminders
      const reminderPromises = usersWithoutCheckOut.map(user =>
        this.sendAttendanceReminder(user.id, 'check_out')
      );

      await Promise.all(reminderPromises);
      
      console.log(`Sent ${usersWithoutCheckOut.length} check-out reminders`);
    } catch (error) {
      console.error('Failed to send daily check-out reminders:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5PM) // Changed from FRIDAY - runs daily for now
  async sendWeeklyProductivityReports() {
    console.log('Sending weekly productivity reports...');

    try {
      // Get all active users
      const users = await this.prisma.auth_user.findMany({
        where: {
          status: 'ACTIVE',
        },
      });

      // Get attitude sessions separately for each user
      const reportPromises = users.map(async (user) => {
        const sessions = await this.prisma.attitude_session.findMany({
          where: {
            user_id: user.id,
            created_at: {
              gte: subDays(new Date(), 7),
            },
          },
        });

        if (sessions.length === 0) return null;

        const totalActiveTime = sessions.reduce(
          (sum, session) => sum + (session.total_active_time || 0), 
          0
        );
        
        const avgProductivityScore = sessions.reduce(
          (sum, session) => sum + (session.productivity_score || 0), 
          0
        ) / sessions.length;

        return this.sendProductivityReport(user.id, {
          period: 'Weekly',
          score: Math.round(avgProductivityScore),
          activeTime: totalActiveTime,
        });
      });

      await Promise.all(reportPromises);
      
      console.log(`Sent weekly productivity reports to active users`);
    } catch (error) {
      console.error('Failed to send weekly productivity reports:', error);
    }
  }

  // Admin notification methods
  async getSystemNotificationStats(companyId?: string) {
    const whereClause: any = {};
    
    if (companyId) {
      whereClause.user = {
        tenant_id: companyId,
      };
    }

    const [
      totalNotifications,
      unreadNotifications,
      notificationsByType,
      recentNotifications
    ] = await Promise.all([
      this.prisma.notification.count({
        where: whereClause,
      }),
      this.prisma.notification.count({
        where: {
          ...whereClause,
          status: 'UNREAD',
        },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: whereClause,
        _count: {
          type: true,
        },
      }),
      this.prisma.notification.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalNotifications,
        unreadNotifications,
        readRate: totalNotifications > 0 ? 
          ((totalNotifications - unreadNotifications) / totalNotifications) * 100 : 0,
      },
      typeDistribution: notificationsByType,
      recentNotifications,
    };
  }

  async cleanupOldNotifications(daysOld: number = 30) {
    const cutoffDate = subDays(new Date(), daysOld);
    
    const result = await this.prisma.notification.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
        status: 'READ',
      },
    });

    console.log(`Cleaned up ${result.count} old notifications`);
    return result;
  }
}