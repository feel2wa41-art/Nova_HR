import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    metadata?: any;
  }) {
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

  async getNotifications(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        status: 'read',
        read_at: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        status: 'UNREAD',
      },
      data: {
        status: 'read',
        read_at: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        user_id: userId,
        status: 'UNREAD',
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });
  }
}