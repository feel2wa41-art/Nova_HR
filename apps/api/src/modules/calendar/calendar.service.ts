import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { 
  CreateCalendarEventDto, 
  UpdateCalendarEventDto, 
  GetCalendarEventsQueryDto,
  RespondToEventDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  GetAnnouncementsQueryDto,
  UpdateCalendarSettingsDto
} from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  // ================================
  // CALENDAR EVENTS
  // ================================

  async createEvent(companyId: string, creatorId: string, dto: CreateCalendarEventDto) {
    const event = await this.prisma.calendar_event.create({
      data: {
        company_id: companyId,
        creator_id: creatorId,
        title: dto.title,
        description: dto.description,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        all_day: dto.all_day || false,
        event_type: dto.event_type || 'PERSONAL',
        location: dto.location,
        color: dto.color || '#1890ff',
        is_public: dto.is_public || false,
        is_recurring: dto.is_recurring || false,
        recurrence_rule: dto.recurrence_rule,
        reminder_minutes: dto.reminder_minutes || [15],
        status: dto.status || 'CONFIRMED',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
              }
            }
          }
        }
      }
    });

    // Add attendees if specified
    if (dto.attendee_ids && dto.attendee_ids.length > 0) {
      // Add creator as organizer
      await this.prisma.calendar_event_attendee.create({
        data: {
          event_id: event.id,
          user_id: creatorId,
          status: 'ACCEPTED',
          is_organizer: true,
          can_edit: true,
        }
      });

      // Add other attendees
      await this.prisma.calendar_event_attendee.createMany({
        data: dto.attendee_ids.map(userId => ({
          event_id: event.id,
          user_id: userId,
          status: 'PENDING',
          is_organizer: false,
          can_edit: false,
        }))
      });
    }

    return this.findEventById(event.id);
  }

  async findEventById(eventId: string) {
    const event = await this.prisma.calendar_event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
              }
            }
          }
        },
        attachments: true,
      }
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async getEvents(companyId: string, userId: string, query: GetCalendarEventsQueryDto) {
    const {
      start_date,
      end_date,
      event_type,
      include_others = false,
      user_id
    } = query;

    const where: any = {
      company_id: companyId,
    };

    // Date range filter
    if (start_date || end_date) {
      where.AND = [];
      if (start_date) {
        where.AND.push({
          end_date: { gte: new Date(start_date) }
        });
      }
      if (end_date) {
        where.AND.push({
          start_date: { lte: new Date(end_date) }
        });
      }
    }

    // Event type filter
    if (event_type) {
      where.event_type = event_type;
    }

    // User-specific events
    if (user_id) {
      where.OR = [
        { creator_id: user_id },
        { attendees: { some: { user_id: user_id } } }
      ];
    } else if (!include_others) {
      // Only show user's own events and public events
      where.OR = [
        { creator_id: userId },
        { attendees: { some: { user_id: userId } } },
        { is_public: true }
      ];
    }

    const events = await this.prisma.calendar_event.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
              }
            }
          }
        }
      },
      orderBy: {
        start_date: 'asc'
      }
    });

    return events;
  }

  async updateEvent(eventId: string, userId: string, dto: UpdateCalendarEventDto) {
    const event = await this.prisma.calendar_event.findUnique({
      where: { id: eventId },
      include: {
        attendees: {
          where: { user_id: userId }
        }
      }
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can edit (creator or attendee with edit permission)
    const canEdit = event.creator_id === userId || 
                   event.attendees.some(att => att.user_id === userId && att.can_edit);

    if (!canEdit) {
      throw new ForbiddenException('You do not have permission to edit this event');
    }

    const updatedEvent = await this.prisma.calendar_event.update({
      where: { id: eventId },
      data: {
        title: dto.title,
        description: dto.description,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        all_day: dto.all_day,
        event_type: dto.event_type,
        location: dto.location,
        color: dto.color,
        is_public: dto.is_public,
        is_recurring: dto.is_recurring,
        recurrence_rule: dto.recurrence_rule,
        reminder_minutes: dto.reminder_minutes,
        status: dto.status,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
              }
            }
          }
        }
      }
    });

    return updatedEvent;
  }

  async deleteEvent(eventId: string, userId: string) {
    const event = await this.prisma.calendar_event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.creator_id !== userId) {
      throw new ForbiddenException('Only the creator can delete this event');
    }

    await this.prisma.calendar_event.delete({
      where: { id: eventId }
    });

    return { message: 'Event deleted successfully' };
  }

  async respondToEvent(eventId: string, userId: string, dto: RespondToEventDto) {
    const attendee = await this.prisma.calendar_event_attendee.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    if (!attendee) {
      throw new NotFoundException('You are not invited to this event');
    }

    return this.prisma.calendar_event_attendee.update({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      },
      data: {
        status: dto.status,
        response_message: dto.response_message,
      }
    });
  }

  // ================================
  // PUBLIC HOLIDAYS
  // ================================

  async getPublicHolidays(country: string = 'KR', year?: number) {
    const where: any = { country };
    
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    return this.prisma.public_holiday.findMany({
      where,
      orderBy: { date: 'asc' }
    });
  }

  async syncPublicHolidays(country: string = 'KR', year: number) {
    // This would typically call an external API to get holidays
    // For now, we'll add some sample Korean holidays
    const holidays = [
      { name: '신정', date: new Date(year, 0, 1), description: '새해 첫날' },
      { name: '삼일절', date: new Date(year, 2, 1), description: '3·1절' },
      { name: '어린이날', date: new Date(year, 4, 5), description: '어린이날' },
      { name: '현충일', date: new Date(year, 5, 6), description: '현충일' },
      { name: '광복절', date: new Date(year, 7, 15), description: '광복절' },
      { name: '개천절', date: new Date(year, 9, 3), description: '개천절' },
      { name: '한글날', date: new Date(year, 9, 9), description: '한글날' },
      { name: '크리스마스', date: new Date(year, 11, 25), description: '성탄절' },
    ];

    const createdHolidays = [];
    for (const holiday of holidays) {
      try {
        const created = await this.prisma.public_holiday.upsert({
          where: {
            country_date_name: {
              country,
              date: holiday.date,
              name: holiday.name
            }
          },
          update: {
            description: holiday.description
          },
          create: {
            country,
            name: holiday.name,
            date: holiday.date,
            description: holiday.description,
            is_national: true
          }
        });
        createdHolidays.push(created);
      } catch (error) {
        console.warn(`Failed to sync holiday ${holiday.name}:`, error.message);
      }
    }

    return createdHolidays;
  }

  // ================================
  // COMPANY ANNOUNCEMENTS
  // ================================

  async createAnnouncement(companyId: string, authorId: string, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.company_announcement.create({
      data: {
        company_id: companyId,
        author_id: authorId,
        title: dto.title,
        content: dto.content,
        announcement_type: dto.announcement_type || 'GENERAL',
        priority: dto.priority || 'NORMAL',
        publish_date: dto.publish_date ? new Date(dto.publish_date) : new Date(),
        expire_date: dto.expire_date ? new Date(dto.expire_date) : null,
        target_audience: dto.target_audience || 'ALL',
        department_ids: dto.department_ids || [],
        user_ids: dto.user_ids || [],
        is_published: true,
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

    return announcement;
  }

  async getAnnouncements(companyId: string, userId: string, query: GetAnnouncementsQueryDto) {
    const {
      announcement_type,
      priority,
      unread_only,
      page = 1,
      limit = 20
    } = query;

    const where: any = {
      company_id: companyId,
      is_published: true,
      OR: [
        { target_audience: 'ALL' },
        { user_ids: { has: userId } },
        // This would need to check user's department
      ]
    };

    if (announcement_type) {
      where.announcement_type = announcement_type;
    }

    if (priority) {
      where.priority = priority;
    }

    // Check for publish/expire dates
    const now = new Date();
    where.AND = [
      { publish_date: { lte: now } },
      {
        OR: [
          { expire_date: null },
          { expire_date: { gt: now } }
        ]
      }
    ];

    if (unread_only) {
      where.NOT = {
        read_receipts: {
          some: { user_id: userId }
        }
      };
    }

    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      this.prisma.company_announcement.findMany({
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
          read_receipts: {
            where: { user_id: userId }
          },
          _count: {
            select: {
              read_receipts: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { created_at: 'desc' }
        ],
        skip,
        take: limit,
      }),
      this.prisma.company_announcement.count({ where }),
    ]);

    return {
      data: announcements.map(announcement => ({
        ...announcement,
        is_read: announcement.read_receipts.length > 0
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAnnouncementAsRead(announcementId: string, userId: string) {
    await this.prisma.company_announcement_read.upsert({
      where: {
        announcement_id_user_id: {
          announcement_id: announcementId,
          user_id: userId
        }
      },
      update: {
        read_at: new Date()
      },
      create: {
        announcement_id: announcementId,
        user_id: userId
      }
    });

    // Update read count
    const readCount = await this.prisma.company_announcement_read.count({
      where: { announcement_id: announcementId }
    });

    await this.prisma.company_announcement.update({
      where: { id: announcementId },
      data: { read_count: readCount }
    });

    return { message: 'Announcement marked as read' };
  }

  // ================================
  // CALENDAR SETTINGS
  // ================================

  async getCalendarSettings(userId: string) {
    let settings = await this.prisma.user_calendar_settings.findUnique({
      where: { user_id: userId }
    });

    if (!settings) {
      // Create default settings
      settings = await this.prisma.user_calendar_settings.create({
        data: {
          user_id: userId,
        }
      });
    }

    return settings;
  }

  async updateCalendarSettings(userId: string, dto: UpdateCalendarSettingsDto) {
    return this.prisma.user_calendar_settings.upsert({
      where: { user_id: userId },
      update: {
        default_view: dto.default_view,
        week_start: dto.week_start,
        work_hours_start: dto.work_hours_start,
        work_hours_end: dto.work_hours_end,
        show_weekends: dto.show_weekends,
        default_reminder: dto.default_reminder,
        time_zone: dto.time_zone,
        show_declined_events: dto.show_declined_events,
        calendar_color_scheme: dto.calendar_color_scheme,
      },
      create: {
        user_id: userId,
        default_view: dto.default_view || 'MONTH',
        week_start: dto.week_start || 0,
        work_hours_start: dto.work_hours_start || '09:00',
        work_hours_end: dto.work_hours_end || '18:00',
        show_weekends: dto.show_weekends ?? true,
        default_reminder: dto.default_reminder || 15,
        time_zone: dto.time_zone || 'Asia/Seoul',
        show_declined_events: dto.show_declined_events || false,
        calendar_color_scheme: dto.calendar_color_scheme,
      }
    });
  }

  // ================================
  // UTILITY METHODS
  // ================================

  async getUpcomingEvents(companyId: string, userId: string, days: number = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    return this.getEvents(companyId, userId, {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });
  }

  async getTodaysEvents(companyId: string, userId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return this.getEvents(companyId, userId, {
      start_date: startOfDay.toISOString(),
      end_date: endOfDay.toISOString(),
    });
  }
}