import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateDailyReportDto, UpdateDailyReportDto, CreateDailyReportEntryDto } from './dto/daily-report.dto';

@Injectable()
export class DailyReportService {
  constructor(private prisma: PrismaService) {}

  async createReport(userId: string, dto: CreateDailyReportDto) {
    // Check if report already exists for this date
    const existingReport = await this.prisma.daily_report.findFirst({
      where: {
        user_id: userId,
        report_date: new Date(dto.report_date)
      }
    });

    if (existingReport) {
      throw new ForbiddenException('Daily report already exists for this date');
    }

    return this.prisma.daily_report.create({
      data: {
        user_id: userId,
        report_date: new Date(dto.report_date),
        summary: dto.summary,
        status: 'DRAFT',
        entries: {
          create: dto.entries?.map(entry => ({
            category_id: entry.category_id,
            task_description: entry.task_description,
            output: entry.output,
            notes: entry.notes,
            duration_minutes: entry.duration_minutes || 0,
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

  async updateReport(userId: string, reportId: string, dto: UpdateDailyReportDto) {
    const report = await this.prisma.daily_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot update submitted report');
    }

    return this.prisma.daily_report.update({
      where: { id: reportId },
      data: {
        summary: dto.summary,
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
    const report = await this.prisma.daily_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Report already submitted');
    }

    return this.prisma.daily_report.update({
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
      this.prisma.daily_report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { report_date: 'desc' },
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
      this.prisma.daily_report.count({ where })
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
    const report = await this.prisma.daily_report.findFirst({
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
      throw new NotFoundException('Daily report not found');
    }

    return report;
  }

  async deleteReport(userId: string, reportId: string) {
    const report = await this.prisma.daily_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot delete submitted report');
    }

    return this.prisma.daily_report.delete({
      where: { id: reportId }
    });
  }

  // Entry management
  async addEntry(userId: string, reportId: string, dto: CreateDailyReportEntryDto) {
    const report = await this.prisma.daily_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot modify submitted report');
    }

    return this.prisma.daily_report_entry.create({
      data: {
        report_id: reportId,
        category_id: dto.category_id,
        task_description: dto.task_description,
        output: dto.output,
        notes: dto.notes,
        duration_minutes: dto.duration_minutes || 0,
        programs_used: dto.programs_used || []
      },
      include: {
        category: true
      }
    });
  }

  async updateEntry(userId: string, reportId: string, entryId: string, dto: Partial<CreateDailyReportEntryDto>) {
    const report = await this.prisma.daily_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot modify submitted report');
    }

    const entry = await this.prisma.daily_report_entry.findFirst({
      where: {
        id: entryId,
        report_id: reportId
      }
    });

    if (!entry) {
      throw new NotFoundException('Report entry not found');
    }

    return this.prisma.daily_report_entry.update({
      where: { id: entryId },
      data: dto,
      include: {
        category: true
      }
    });
  }

  async deleteEntry(userId: string, reportId: string, entryId: string) {
    const report = await this.prisma.daily_report.findFirst({
      where: {
        id: reportId,
        user_id: userId
      }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status === 'SUBMITTED') {
      throw new ForbiddenException('Cannot modify submitted report');
    }

    const entry = await this.prisma.daily_report_entry.findFirst({
      where: {
        id: entryId,
        report_id: reportId
      }
    });

    if (!entry) {
      throw new NotFoundException('Report entry not found');
    }

    return this.prisma.daily_report_entry.delete({
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
    // TODO: Add proper team member validation based on org structure
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.user_id = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.report_date = {};
      if (filters.startDate) {
        where.report_date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.report_date.lte = new Date(filters.endDate);
      }
    }

    const [reports, total] = await Promise.all([
      this.prisma.daily_report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { report_date: 'desc' },
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
      this.prisma.daily_report.count({ where })
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
    const report = await this.prisma.daily_report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.status !== 'SUBMITTED') {
      throw new ForbiddenException('Can only review submitted reports');
    }

    return this.prisma.daily_report.update({
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
}