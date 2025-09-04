import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as webpush from 'web-push';
import * as nodemailer from 'nodemailer';

interface NotificationPayload {
  title: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class NotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    // Configure web-push
    webpush.setVapidDetails(
      'mailto:admin@nova-hr.com',
      process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI2BNa40JvIaPzkCVAuCvhW0TIHHfaDQeP_h4SLjYDJ7aewVQnE8iLrjDU',
      process.env.VAPID_PRIVATE_KEY || 'nR3SBCMCIlj-KzRoVTEqZLqBKv2kW0T7rHc2TBcHTjU'
    );

    // Configure email transporter (using MailHog for development)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false, // true for 465, false for other ports
      auth: process.env.NODE_ENV === 'production' ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
    });
  }

  // ================================
  // WEB PUSH NOTIFICATIONS
  // ================================

  async saveWebPushSubscription(userId: string, subscription: any) {
    return this.prisma.web_push_subscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        is_active: true,
      },
      create: {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: subscription.userAgent || null,
      },
    });
  }

  async removeWebPushSubscription(endpoint: string) {
    return this.prisma.web_push_subscription.delete({
      where: { endpoint },
    });
  }

  async sendWebPushToUser(userId: string, payload: NotificationPayload) {
    const subscriptions = await this.prisma.web_push_subscription.findMany({
      where: { user_id: userId, is_active: true },
    });

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        const webPushPayload = {
          title: payload.title,
          body: payload.message,
          icon: payload.icon || '/icon-192x192.png',
          badge: payload.badge || '/icon-72x72.png',
          image: payload.image,
          url: payload.url || '/',
          data: payload.data,
          timestamp: Date.now(),
          requireInteraction: false,
          silent: false,
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(webPushPayload)
        );

        results.push({ endpoint: subscription.endpoint, success: true });
      } catch (error) {
        console.error(`Web push failed for endpoint ${subscription.endpoint}:`, error);
        
        // Disable subscription if it's invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.prisma.web_push_subscription.update({
            where: { id: subscription.id },
            data: { is_active: false },
          });
        }
        
        results.push({ 
          endpoint: subscription.endpoint, 
          success: false, 
          error: error.message 
        });
      }
    }

    return results;
  }

  async sendWebPushToMultipleUsers(userIds: string[], payload: NotificationPayload) {
    const results = [];
    for (const userId of userIds) {
      const userResults = await this.sendWebPushToUser(userId, payload);
      results.push({ userId, results: userResults });
    }
    return results;
  }

  // ================================
  // EMAIL NOTIFICATIONS
  // ================================

  async sendEmail(options: EmailOptions) {
    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"Nova HR" <noreply@nova-hr.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmailToUser(userId: string, subject: string, html: string, text?: string) {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }

  async sendEmailToMultipleUsers(userIds: string[], subject: string, html: string, text?: string) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.sendEmailToUser(userId, subject, html, text);
      results.push({ userId, result });
    }
    return results;
  }

  // ================================
  // NOTIFICATION PREFERENCES
  // ================================

  async getUserNotificationPreferences(userId: string) {
    let preferences = await this.prisma.user_notification_preference.findUnique({
      where: { user_id: userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.user_notification_preference.create({
        data: { user_id: userId },
      });
    }

    return preferences;
  }

  async updateUserNotificationPreferences(userId: string, data: any) {
    return this.prisma.user_notification_preference.upsert({
      where: { user_id: userId },
      update: data,
      create: { user_id: userId, ...data },
    });
  }

  async isNotificationEnabled(userId: string, type: string, channel: 'web_push' | 'email' | 'app_push') {
    const preferences = await this.getUserNotificationPreferences(userId);
    
    // Check if channel is enabled
    if (channel === 'web_push' && !preferences.web_push_enabled) return false;
    if (channel === 'email' && !preferences.email_enabled) return false;
    if (channel === 'app_push' && !preferences.app_push_enabled) return false;

    // Check if notification type is enabled
    const typeEnabled = {
      'community_posts': preferences.community_posts,
      'announcements': preferences.announcements,
      'comments': preferences.comments,
      'likes': preferences.likes,
      'mentions': preferences.mentions,
    };

    if (typeEnabled[type] === false) return false;

    // Check if only urgent notifications are enabled
    if (preferences.urgent_only && type !== 'urgent' && type !== 'announcements') {
      return false;
    }

    // Check quiet hours
    if (preferences.quiet_hours_enabled && preferences.quiet_hours_start && preferences.quiet_hours_end) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = preferences.quiet_hours_start.split(':').map(Number);
      const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (startTime <= endTime) {
        // Same day quiet hours
        if (currentTime >= startTime && currentTime < endTime) {
          return false;
        }
      } else {
        // Quiet hours cross midnight
        if (currentTime >= startTime || currentTime < endTime) {
          return false;
        }
      }
    }

    return true;
  }

  // ================================
  // COMMUNITY NOTIFICATIONS
  // ================================

  async createCommunityNotification(
    postId: string,
    recipientIds: string[],
    type: string,
    title: string,
    message: string
  ) {
    const notifications = [];
    for (const recipientId of recipientIds) {
      const notification = await this.prisma.hr_community_notification.create({
        data: {
          post_id: postId,
          recipient_id: recipientId,
          notification_type: type,
          title,
          message,
        },
      });
      notifications.push(notification);
    }
    return notifications;
  }

  async sendCommunityNotification(
    postId: string,
    recipientIds: string[],
    type: string,
    title: string,
    message: string,
    url?: string
  ) {
    // Create notification records
    const notifications = await this.createCommunityNotification(
      postId,
      recipientIds,
      type,
      title,
      message
    );

    const results = {
      webPush: [],
      email: [],
      notifications: notifications,
    };

    for (const recipientId of recipientIds) {
      // Send web push notification
      if (await this.isNotificationEnabled(recipientId, type.toLowerCase(), 'web_push')) {
        try {
          const webPushResult = await this.sendWebPushToUser(recipientId, {
            title,
            message,
            url,
            icon: '/icon-192x192.png',
          });
          results.webPush.push({ userId: recipientId, result: webPushResult });

          // Mark as sent
          await this.prisma.hr_community_notification.updateMany({
            where: {
              post_id: postId,
              recipient_id: recipientId,
              notification_type: type,
            },
            data: {
              web_push_sent: true,
              web_push_sent_at: new Date(),
            },
          });
        } catch (error) {
          console.error('Web push notification failed:', error);
        }
      }

      // Send email notification
      if (await this.isNotificationEnabled(recipientId, type.toLowerCase(), 'email')) {
        try {
          const emailHtml = this.generateEmailHtml(title, message, url);
          const emailResult = await this.sendEmailToUser(recipientId, title, emailHtml);
          results.email.push({ userId: recipientId, result: emailResult });

          // Mark as sent
          await this.prisma.hr_community_notification.updateMany({
            where: {
              post_id: postId,
              recipient_id: recipientId,
              notification_type: type,
            },
            data: {
              email_sent: true,
              email_sent_at: new Date(),
            },
          });
        } catch (error) {
          console.error('Email notification failed:', error);
        }
      }
    }

    return results;
  }

  private generateEmailHtml(title: string, message: string, url?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nova HR</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>${message}</p>
              ${url ? `<a href="${url}" class="button">확인하기</a>` : ''}
            </div>
            <div class="footer">
              <p>이 메일은 Nova HR 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // ================================
  // NOTIFICATION MANAGEMENT
  // ================================

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.hr_community_notification.findMany({
        where: { recipient_id: userId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              post_type: true,
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.hr_community_notification.count({
        where: { recipient_id: userId },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    return this.prisma.hr_community_notification.updateMany({
      where: {
        id: notificationId,
        recipient_id: userId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.prisma.hr_community_notification.updateMany({
      where: {
        recipient_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async getUnreadNotificationCount(userId: string) {
    return this.prisma.hr_community_notification.count({
      where: {
        recipient_id: userId,
        is_read: false,
      },
    });
  }
}