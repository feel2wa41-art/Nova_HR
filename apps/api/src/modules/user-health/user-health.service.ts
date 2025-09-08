import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { UpdateUserStatusDto, CreateEventDto, UpdateEventDto } from './dto/user-health.dto';

@Injectable()
export class UserHealthService {
  constructor(private prisma: PrismaService) {}

  // Organization Chart & User Status
  async getOrganizationChart(companyId: string) {
    const orgUnits = await this.prisma.org_unit.findMany({
      where: { company_id: companyId },
      include: {
        members: {
          include: {
            user_status: true,
            employee_profile: true
          }
        },
        parent: true,
        children: true
      },
      orderBy: { name: 'asc' }
    });

    // Build tree structure
    const buildTree = (units: any[], parentId: string | null = null) => {
      return units
        .filter(unit => unit.parent_id === parentId)
        .map(unit => ({
          ...unit,
          children: buildTree(units, unit.id)
        }));
    };

    return buildTree(orgUnits);
  }

  async getUsersWithStatus(companyId: string, filters?: {
    orgUnitId?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {
      org_unit: {
        company_id: companyId
      }
    };

    if (filters?.orgUnitId) {
      where.org_id = filters.orgUnitId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const users = await this.prisma.auth_user.findMany({
      where,
      include: {
        employee_profile: true,
        org_unit: true,
        // Get current leave status
        leave_requests: {
          where: {
            status: 'APPROVED',
            start_date: { lte: new Date() },
            end_date: { gte: new Date() }
          },
          take: 1,
          orderBy: { start_date: 'desc' }
        },
        // Get latest attendance
        attendance: {
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          take: 1,
          orderBy: { created_at: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      title: user.title,
      email: user.email,
      avatar_url: user.avatar_url,
      org_unit: user.org_unit?.name,
      status: this.calculateUserStatus(user),
      employee_profile: user.employee_profile,
      is_birthday_today: this.isBirthdayToday(user.employee_profile?.hire_date),
      is_on_leave: user.leave_requests.length > 0,
      leave_info: user.leave_requests[0] || null,
      last_attendance: user.attendance[0] || null
    }));
  }

  private calculateUserStatus(user: any): string {
    // Check if on approved leave
    if (user.leave_requests.length > 0) {
      const leave = user.leave_requests[0];
      switch (leave.leave_type) {
        case 'SICK': return 'SICK_LEAVE';
        case 'ANNUAL': return 'ON_LEAVE';
        default: return 'ON_LEAVE';
      }
    }

    // Check attendance today
    if (user.attendance.length > 0) {
      const attendance = user.attendance[0];
      if (attendance.check_out_time) {
        return 'OFFLINE'; // Already checked out
      } else {
        return 'ONLINE'; // Checked in, working
      }
    }

    // Check last seen (from user_status)
    if (user.user_status?.last_seen) {
      const lastSeen = new Date(user.user_status.last_seen);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
      
      if (diffMinutes < 5) return 'ONLINE';
      if (diffMinutes < 30) return 'AWAY';
      return 'OFFLINE';
    }

    return 'OFFLINE';
  }

  private isBirthdayToday(birthday?: Date): boolean {
    if (!birthday) return false;
    
    const today = new Date();
    const birthDate = new Date(birthday);
    
    return today.getMonth() === birthDate.getMonth() && 
           today.getDate() === birthDate.getDate();
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    await this.prisma.user_status.upsert({
      where: { user_id: userId },
      update: {
        status: dto.status,
        location: dto.location,
        mood: dto.mood,
        status_message: dto.status_message,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        phone_extension: dto.phone_extension,
        last_seen: new Date()
      },
      create: {
        user_id: userId,
        status: dto.status || 'ACTIVE',
        location: dto.location,
        mood: dto.mood,
        status_message: dto.status_message,
        birthday: dto.birthday ? new Date(dto.birthday) : null,
        phone_extension: dto.phone_extension,
        last_seen: new Date()
      }
    });

    return { message: 'User status updated successfully' };
  }

  async updateLastSeen(userId: string) {
    await this.prisma.user_status.upsert({
      where: { user_id: userId },
      update: { last_seen: new Date() },
      create: {
        user_id: userId,
        last_seen: new Date()
      }
    });
  }

  // Birthday & Holiday Notifications
  async getTodaysBirthdays(companyId: string) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const users = await this.prisma.auth_user.findMany({
      where: {
        org_unit: {
          company_id: companyId
        },
        user_status: {
          birthday: {
            not: null
          }
        }
      },
      include: {
        user_status: true,
        org_unit: true
      }
    });

    return users.filter(user => {
      if (!user.user_status?.birthday) return false;
      const birthday = new Date(user.user_status.birthday);
      return birthday.getMonth() + 1 === month && birthday.getDate() === day;
    }).map(user => ({
      id: user.id,
      name: user.name,
      title: user.title,
      avatar_url: user.avatar_url,
      org_unit: user.org_unit?.name,
      birthday: user.user_status?.birthday
    }));
  }

  async getUpcomingBirthdays(companyId: string, days: number = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const users = await this.prisma.auth_user.findMany({
      where: {
        org_unit: {
          company_id: companyId
        },
        user_status: {
          birthday: {
            not: null
          }
        }
      },
      include: {
        user_status: true,
        org_unit: true
      }
    });

    return users.filter(user => {
      if (!user.user_status?.birthday) return false;
      
      const birthday = new Date(user.user_status.birthday);
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      
      // If birthday already passed this year, consider next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      return thisYearBirthday >= today && thisYearBirthday <= futureDate;
    }).map(user => ({
      id: user.id,
      name: user.name,
      title: user.title,
      avatar_url: user.avatar_url,
      org_unit: user.org_unit?.name,
      birthday: user.user_status?.birthday,
      days_until_birthday: Math.ceil((new Date(today.getFullYear(), new Date(user.user_status!.birthday!).getMonth(), new Date(user.user_status!.birthday!).getDate()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  // Events Management
  async createEvent(companyId: string, organizerId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        company_id: companyId,
        organizer_id: organizerId,
        title: dto.title,
        description: dto.description,
        event_type: dto.event_type || 'GENERAL',
        start_date: new Date(dto.start_date),
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        all_day: dto.all_day || false,
        location: dto.location,
        max_participants: dto.max_participants,
        is_public: dto.is_public ?? true
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Auto-invite participants if specified
    if (dto.participant_ids && dto.participant_ids.length > 0) {
      await this.prisma.event_participant.createMany({
        data: dto.participant_ids.map(userId => ({
          event_id: event.id,
          user_id: userId
        }))
      });
    }

    return event;
  }

  async getEvents(companyId: string, filters?: {
    start_date?: string;
    end_date?: string;
    event_type?: string;
    status?: string;
  }) {
    const where: any = { company_id: companyId };

    if (filters?.start_date || filters?.end_date) {
      where.start_date = {};
      if (filters.start_date) {
        where.start_date.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        where.start_date.lte = new Date(filters.end_date);
      }
    }

    if (filters?.event_type) {
      where.event_type = filters.event_type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true
              }
            }
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: { start_date: 'asc' }
    });
  }

  async participateInEvent(eventId: string, userId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) {
    return this.prisma.event_participant.upsert({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      },
      update: {
        status,
        notes,
        responded_at: new Date()
      },
      create: {
        event_id: eventId,
        user_id: userId,
        status,
        notes
      }
    });
  }

  // Dashboard Summary
  async getDashboardSummary(companyId: string) {
    const [
      totalUsers,
      onlineUsers,
      onLeaveUsers,
      todaysBirthdays,
      upcomingEvents
    ] = await Promise.all([
      // Total users
      this.prisma.auth_user.count({
        where: {
          org_unit: {
            company_id: companyId
          }
        }
      }),

      // Online users (attended today and not checked out)
      this.prisma.auth_user.count({
        where: {
          org_unit: {
            company_id: companyId
          },
          attendance: {
            some: {
              created_at: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              },
              check_out_at: null
            }
          }
        }
      }),

      // Users on leave today
      this.prisma.auth_user.count({
        where: {
          org_unit: {
            company_id: companyId
          },
          leave_requests: {
            some: {
              status: 'APPROVED',
              start_date: { lte: new Date() },
              end_date: { gte: new Date() }
            }
          }
        }
      }),

      // Today's birthdays count
      this.getTodaysBirthdays(companyId),

      // Upcoming events (next 7 days)
      this.getEvents(companyId, {
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    ]);

    return {
      total_users: totalUsers,
      online_users: onlineUsers,
      on_leave_users: onLeaveUsers,
      offline_users: totalUsers - onlineUsers - onLeaveUsers,
      todays_birthdays: todaysBirthdays.length,
      upcoming_events: upcomingEvents.length
    };
  }
}