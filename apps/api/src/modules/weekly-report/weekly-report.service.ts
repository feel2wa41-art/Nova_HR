import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateWeeklyReportDto, UpdateWeeklyReportDto, CreateWeeklyReportEntryDto } from './dto/weekly-report.dto';

@Injectable()
export class WeeklyReportService {
  constructor(private prisma: PrismaService) {}

  // Get start and end dates for a given week
  private getWeekDates(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  async createReport(userId: string, dto: CreateWeeklyReportDto) {
    const weekDates = this.getWeekDates(new Date(dto.week_start));
    
    // Check if report already exists for this week
    const existingReport = await this.prisma.weekly_report.findFirst({
      where: {
        user_id: userId,
        week_start: weekDates.start
      }
    });

    if (existingReport) {
      throw new ForbiddenException('Weekly report already exists for this week');
    }

    return this.prisma.weekly_report.create({
      data: {
        user_id: userId,
        week_start: weekDates.start,
        week_end: weekDates.end,
        summary: dto.summary,
        achievements: dto.achievements,
        challenges: dto.challenges,
        next_week_goals: dto.next_week_goals,
        status: 'DRAFT',
        is_auto_generated: dto.is_auto_generated || false,
        daily_reports_included: dto.daily_reports_included || [],
        entries: {
          create: dto.entries?.map(entry => ({
            category_id: entry.category_id,
            summary: entry.summary,
            total_hours: entry.total_hours || 0,
            key_tasks: entry.key_tasks || [],
            deliverables: entry.deliverables || [],
            programs_used: entry.programs_used || []
          })) || []
        }
      },
      include: {
        entries: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async generateFromDailyReports(userId: string, weekStart: string) {
    const weekDates = this.getWeekDates(new Date(weekStart));
    
    // Check if report already exists
    const existingReport = await this.prisma.weekly_report.findFirst({
      where: {
        user_id: userId,
        week_start: weekDates.start
      }
    });

    if (existingReport) {
      throw new ForbiddenException('Weekly report already exists for this week');
    }

    // Get daily reports for the week
    const dailyReports = await this.prisma.daily_report.findMany({
      where: {
        user_id: userId,
        report_date: {
          gte: weekDates.start,
          lte: weekDates.end
        },
        status: {
          in: ['SUBMITTED', 'APPROVED']
        }
      },
      include: {
        entries: {
          include: {
            category: true
          }
        }
      },
      orderBy: { report_date: 'asc' }
    });

    if (dailyReports.length === 0) {
      throw new NotFoundException('No approved daily reports found for this week');
    }

    // Aggregate data by category
    const categoryMap = new Map();
    const allPrograms = new Set<string>();
    const allTasks = new Set<string>();
    let totalMinutes = 0;

    for (const dailyReport of dailyReports) {
      for (const entry of dailyReport.entries) {
        const categoryId = entry.category_id;
        
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            category_id: categoryId,
            category: entry.category,
            summary: '',
            total_hours: 0,
            key_tasks: new Set<string>(),
            deliverables: new Set<string>(),
            programs_used: new Set<string>()
          });
        }

        const categoryData = categoryMap.get(categoryId);
        categoryData.total_hours += entry.duration_minutes;
        totalMinutes += entry.duration_minutes;
        
        // Add unique tasks and deliverables
        if (entry.task_description) {
          categoryData.key_tasks.add(entry.task_description);
          allTasks.add(entry.task_description);
        }
        if (entry.output) {
          categoryData.deliverables.add(entry.output);
        }
        
        // Add unique programs
        if (entry.programs_used) {
          entry.programs_used.forEach(program => {
            categoryData.programs_used.add(program);
            allPrograms.add(program);
          });
        }
      }
    }

    // Convert sets to arrays and create summaries
    const entries: CreateWeeklyReportEntryDto[] = Array.from(categoryMap.values()).map(data => ({
      category_id: data.category_id,
      summary: `주요 업무: ${Array.from(data.key_tasks).join(', ')}`,
      total_hours: data.total_hours,
      key_tasks: Array.from(data.key_tasks),
      deliverables: Array.from(data.deliverables),
      programs_used: Array.from(data.programs_used)
    }));

    // Generate overall summary
    const totalHours = Math.floor(totalMinutes / 60);
    const summary = `이번 주 총 ${totalHours}시간 근무, ${dailyReports.length}일간 보고서 작성. 주요 카테고리: ${Array.from(categoryMap.values()).map(c => c.category.name).join(', ')}`;
    
    const achievements = `주요 성과:\n${Array.from(allTasks).slice(0, 5).map(task => `• ${task}`).join('\n')}`;

    return this.createReport(userId, {
      week_start: weekStart,
      summary,
      achievements,
      challenges: '',
      next_week_goals: '',
      is_auto_generated: true,
      daily_reports_included: dailyReports.map(r => r.id),
      entries
    });
  }

  async updateReport(userId: string, reportId: string, dto: UpdateWeeklyReportDto) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot update submitted report');
    }

    return this.prisma.weekly_report.update({
      where: { id: reportId },
      data: {
        summary: dto.summary,
        achievements: dto.achievements,
        challenges: dto.challenges,
        next_week_goals: dto.next_week_goals,
        status: dto.status
      },
      include: {
        entries: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async submitReport(userId: string, reportId: string) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Report already submitted');
    }

    return this.prisma.weekly_report.update({
      where: { id: reportId },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date()
      },
      include: {
        entries: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async getUserReports(userId: string, page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = {
      user_id: userId,
      ...(status && { status })
    };

    const [reports, total] = await Promise.all([
      this.prisma.weekly_report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { week_start: 'desc' },
        include: {
          entries: {
            include: {
              category: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      this.prisma.weekly_report.count({ where })
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getReportById(userId: string, reportId: string) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      },
      include: {
        entries: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    return report;
  }

  async deleteReport(userId: string, reportId: string) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot delete submitted report');
    }

    return this.prisma.weekly_report.delete({
      where: { id: reportId }
    });
  }

  // Entry management
  async addEntry(userId: string, reportId: string, dto: CreateWeeklyReportEntryDto) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot modify submitted report');
    }

    return this.prisma.weekly_report_entry.create({
      data: {
        report_id: reportId,
        category_id: dto.category_id,
        summary: dto.summary,
        total_hours: dto.total_hours || 0,
        key_tasks: dto.key_tasks || [],
        deliverables: dto.deliverables || [],
        programs_used: dto.programs_used || []
      },
      include: {
        category: true
      }
    });
  }

  async updateEntry(userId: string, reportId: string, entryId: string, dto: Partial<CreateWeeklyReportEntryDto>) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot modify submitted report');
    }

    const entry = await this.prisma.weekly_report_entry.findFirst({
      where: {
        id: entryId,
        report_id: reportId
      }
    });

    if (!entry) {
      throw new NotFoundException('Report entry not found');
    }

    return this.prisma.weekly_report_entry.update({
      where: { id: entryId },
      data: dto,
      include: {
        category: true
      }
    });
  }

  async deleteEntry(userId: string, reportId: string, entryId: string) {
    const report = await this.prisma.weekly_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot modify submitted report');
    }

    const entry = await this.prisma.weekly_report_entry.findFirst({
      where: {
        id: entryId,
        report_id: reportId
      }
    });

    if (!entry) {
      throw new NotFoundException('Report entry not found');
    }

    return this.prisma.weekly_report_entry.delete({
      where: { id: entryId }
    });
  }

  // Manager/Admin functions
  async getTeamReports(managerId: string, page: number = 1, limit: number = 20, filters?: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.user_id = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.week_start = {};
      if (filters.startDate) {
        where.week_start.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.week_start.lte = new Date(filters.endDate);
      }
    }

    const [reports, total] = await Promise.all([
      this.prisma.weekly_report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { week_start: 'desc' },
        include: {
          entries: {
            include: {
              category: true
            }
          },
          user: {
            select: {
              name: true,
              email: true,
              title: true
            }
          }
        }
      }),
      this.prisma.weekly_report.count({ where })
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async reviewReport(reviewerId: string, reportId: string, status: 'APPROVED' | 'REJECTED') {
    const report = await this.prisma.weekly_report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new NotFoundException('Weekly report not found');
    }

    if (report.status !== 'SUBMITTED') {
      throw new ForbiddenException('Can only review submitted reports');
    }

    return this.prisma.weekly_report.update({
      where: { id: reportId },
      data: {
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date()
      },
      include: {
        entries: {
          include: {
            category: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            title: true
          }
        },
        reviewer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  // Check if user has daily reports for a given week
  async checkDailyReportsAvailable(userId: string, weekStart: string) {
    const weekDates = this.getWeekDates(new Date(weekStart));
    
    const dailyReports = await this.prisma.daily_report.findMany({
      where: {
        user_id: userId,
        report_date: {
          gte: weekDates.start,
          lte: weekDates.end
        },
        status: {
          in: ['SUBMITTED', 'APPROVED']
        }
      }
    });

    return {
      available: dailyReports.length > 0,
      count: dailyReports.length,
      reports: dailyReports.map(r => ({
        id: r.id,
        date: r.report_date,
        status: r.status
      }))
    };
  }
}