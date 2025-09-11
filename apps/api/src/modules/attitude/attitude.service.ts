import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { 
  SubmitScreenshotDto, 
  SubmitActivityDataDto, 
  GetAttitudeStatsDto,
  GetProductivityAnalyticsDto,
  AttitudePeriod,
  UpdateScreenshotStatusDto,
  GetScreenshotGalleryDto,
  LiveMonitoringDto
} from './dto/attitude.dto';
import { uploadFile } from '../../shared/utils/file-upload.util';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays
} from 'date-fns';

@Injectable()
export class AttitudeService {
  constructor(private prisma: PrismaService) {}

  // Screenshot Management
  async submitScreenshot(userId: string, companyId: string, file: Express.Multer.File, dto: SubmitScreenshotDto) {
    try {
      // Get user's tenant_id for security and multi-tenant isolation
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId },
        select: { tenant_id: true }
      });
      
      if (!user || !user.tenant_id) {
        throw new ForbiddenException('User not found or not associated with a tenant');
      }

      // Upload file to storage
      const uploadResult = await uploadFile(file, 'uploads/screenshots');

      // Parse metadata if provided
      let metadata = null;
      if (dto.metadata) {
        try {
          metadata = JSON.parse(dto.metadata);
        } catch (error) {
          console.warn('Invalid metadata JSON:', dto.metadata);
        }
      }

      // Find or create attitude session for today with tenant isolation
      const sessionDate = new Date(dto.timestamp);
      const dateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
      
      let session = await this.prisma.attitude_session.findUnique({
        where: {
          user_id_date: {
            user_id: userId,
            date: dateOnly,
          },
        },
      });

      if (!session) {
        session = await this.prisma.attitude_session.create({
          data: {
            user_id: userId,
            tenant_id: user.tenant_id,
            date: dateOnly,
            login_time: new Date(dto.timestamp),
            status: 'ACTIVE',
          },
        });
      }

      // Save screenshot record
      const screenshot = await this.prisma.attitude_screenshot.create({
        data: {
          session_id: session.id,
          file_url: uploadResult.url,
          captured_at: new Date(dto.timestamp),
          metadata: metadata as any,
        },
      });

      // Update user's last screenshot time
      await this.prisma.auth_user.update({
        where: { id: userId },
        data: { updated_at: new Date() }, // Using updated_at since lastScreenshotAt doesn't exist
      });

      return {
        id: screenshot.id,
        message: 'Screenshot uploaded successfully',
      };
    } catch (error) {
      console.error('Failed to submit screenshot:', error);
      throw new BadRequestException('Failed to upload screenshot');
    }
  }

  // Activity Data Management
  async submitActivityData(userId: string, companyId: string, dto: SubmitActivityDataDto) {
    try {
      // Get user's tenant_id for security and multi-tenant isolation
      const user = await this.prisma.auth_user.findUnique({
        where: { id: userId },
        select: { tenant_id: true }
      });
      
      if (!user || !user.tenant_id) {
        throw new ForbiddenException('User not found or not associated with a tenant');
      }

      const activityDate = new Date(dto.date);
      const dateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());

      // Find or create attitude session for the date with tenant isolation
      let session = await this.prisma.attitude_session.findUnique({
        where: {
          user_id_date: {
            user_id: userId,
            date: dateOnly,
          },
        },
      });

      if (!session) {
        session = await this.prisma.attitude_session.create({
          data: {
            user_id: userId,
            tenant_id: user.tenant_id,
            date: dateOnly,
            login_time: activityDate,
            status: 'ACTIVE',
          },
        });
      }

      // Update session with activity summary
      await this.prisma.attitude_session.update({
        where: { id: session.id },
        data: {
          total_active_time: dto.totalActiveTime,
          total_idle_time: dto.idleTime,
          productivity_score: dto.productivityScore,
          last_agent_heartbeat: new Date(),
        },
      });

      // Delete existing application usage data for this session
      await this.prisma.attitude_app_usage.deleteMany({
        where: { session_id: session.id },
      });

      // Create new application usage records
      const appUsageData = dto.applications.map(app => ({
        session_id: session.id,
        app_name: app.name,
        app_category: app.category || 'Other',
        window_title: app.title,
        start_time: new Date(app.startTime),
        end_time: new Date(app.endTime),
        duration: app.duration,
        is_productive: app.isProductive || false,
      }));

      await this.prisma.attitude_app_usage.createMany({
        data: appUsageData,
      });

      return {
        message: 'Activity data submitted successfully',
        sessionId: session.id,
      };
    } catch (error) {
      console.error('Failed to submit activity data:', error);
      throw new BadRequestException('Failed to submit activity data');
    }
  }

  // Get Attitude Statistics
  async getAttitudeStats(userId: string, companyId: string, dto: GetAttitudeStatsDto, isAdmin: boolean = false) {
    try {
      const startDate = dto.startDate ? new Date(dto.startDate) : startOfDay(new Date());
      const endDate = dto.endDate ? new Date(dto.endDate) : endOfDay(new Date());

      // Check permissions
      const targetUserId = isAdmin && dto.userId ? dto.userId : userId;
      
      if (!isAdmin && dto.userId && dto.userId !== userId) {
        throw new ForbiddenException('Cannot access other user\'s data');
      }

      // Get attitude sessions
      const sessions = await this.prisma.attitude_session.findMany({
        where: {
          user_id: targetUserId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          app_usage: true,
          screenshots: true,
        },
        orderBy: { date: 'desc' },
      });

      // Calculate statistics
      const totalDays = sessions.length;
      const totalActiveTime = sessions.reduce((sum, session) => sum + (session.total_active_time || 0), 0);
      const totalIdleTime = sessions.reduce((sum, session) => sum + (session.total_idle_time || 0), 0);
      const avgProductivityScore = totalDays > 0 
        ? sessions.reduce((sum, session) => sum + (session.productivity_score || 0), 0) / totalDays
        : 0;

      // Get screenshot count
      const screenshotCount = sessions.reduce((sum, session) => sum + session.screenshots.length, 0);

      // Get top applications
      const appUsageMap = new Map<string, { duration: number; sessions: number; productive: number }>();
      
      sessions.forEach(session => {
        session.app_usage.forEach(app => {
          const key = app.app_name;
          const existing = appUsageMap.get(key) || { duration: 0, sessions: 0, productive: 0 };
          appUsageMap.set(key, {
            duration: existing.duration + (app.duration || 0),
            sessions: existing.sessions + 1,
            productive: existing.productive + (app.is_productive ? 1 : 0),
          });
        });
      });

      const topApplications = Array.from(appUsageMap.entries())
        .map(([name, data]) => ({
          name,
          duration: data.duration,
          sessions: data.sessions,
          productivityRate: data.sessions > 0 ? (data.productive / data.sessions) * 100 : 0,
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

      // Daily productivity trend
      const dailyStats = sessions.map(session => ({
        date: session.date,
        activeTime: session.total_active_time || 0,
        idleTime: session.total_idle_time || 0,
        productivityScore: session.productivity_score || 0,
        applicationCount: session.app_usage.length,
        screenshotCount: session.screenshots.length,
      }));

      return {
        summary: {
          totalDays,
          totalActiveTime,
          totalIdleTime,
          avgProductivityScore: Math.round(avgProductivityScore * 100) / 100,
          screenshotCount,
        },
        topApplications,
        dailyStats,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      };
    } catch (error) {
      console.error('Failed to get attitude stats:', error);
      throw new BadRequestException('Failed to retrieve attitude statistics');
    }
  }

  // Get Productivity Analytics
  async getProductivityAnalytics(companyId: string, dto: GetProductivityAnalyticsDto, isAdmin: boolean = false) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date, endDate: Date;

      switch (dto.period) {
        case AttitudePeriod.TODAY:
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case AttitudePeriod.WEEK:
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case AttitudePeriod.MONTH:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case AttitudePeriod.QUARTER:
          startDate = startOfQuarter(now);
          endDate = endOfQuarter(now);
          break;
        case AttitudePeriod.YEAR:
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
      }

      // Build where clause
      const whereClause: any = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (dto.userId) {
        whereClause.user_id = dto.userId;
      }

      if (dto.department) {
        whereClause.user = {
          employee_profile: {
            department: dto.department,
          },
        };
      }

      // Get attitude sessions with user info
      const sessions = await this.prisma.attitude_session.findMany({
        where: {
          ...whereClause,
          user: {
            org_unit: {
              company_id: companyId,
            },
          },
        },
        include: {
          user: {
            include: {
              employee_profile: true,
            },
          },
          app_usage: true,
        },
      });

      // Calculate company-wide statistics
      const totalUsers = new Set(sessions.map(session => session.user_id)).size;
      const totalActiveTime = sessions.reduce((sum, session) => sum + (session.total_active_time || 0), 0);
      const avgProductivityScore = sessions.length > 0
        ? sessions.reduce((sum, session) => sum + (session.productivity_score || 0), 0) / sessions.length
        : 0;

      // Department statistics
      const departmentStats = new Map<string, {
        users: Set<string>;
        activeTime: number;
        productivitySum: number;
        logCount: number;
      }>();

      sessions.forEach(session => {
        const department = session.user.employee_profile?.department || 'Unknown';
        const existing = departmentStats.get(department) || {
          users: new Set(),
          activeTime: 0,
          productivitySum: 0,
          logCount: 0,
        };

        existing.users.add(session.user_id);
        existing.activeTime += session.total_active_time || 0;
        existing.productivitySum += session.productivity_score || 0;
        existing.logCount += 1;

        departmentStats.set(department, existing);
      });

      const departmentAnalytics = Array.from(departmentStats.entries()).map(([name, data]) => ({
        department: name,
        userCount: data.users.size,
        totalActiveTime: data.activeTime,
        avgProductivityScore: data.logCount > 0 ? data.productivitySum / data.logCount : 0,
      }));

      // User rankings
      const userStats = new Map<string, {
        user: any;
        activeTime: number;
        productivitySum: number;
        logCount: number;
      }>();

      sessions.forEach(session => {
        const existing = userStats.get(session.user_id) || {
          user: session.user,
          activeTime: 0,
          productivitySum: 0,
          logCount: 0,
        };

        existing.activeTime += session.total_active_time || 0;
        existing.productivitySum += session.productivity_score || 0;
        existing.logCount += 1;

        userStats.set(session.user_id, existing);
      });

      const topPerformers = Array.from(userStats.values())
        .map(data => ({
          userId: data.user.id,
          name: data.user.name,
          email: data.user.email,
          department: data.user.employee_profile?.department,
          activeTime: data.activeTime,
          avgProductivityScore: data.logCount > 0 ? data.productivitySum / data.logCount : 0,
        }))
        .sort((a, b) => b.avgProductivityScore - a.avgProductivityScore)
        .slice(0, 10);

      return {
        period: dto.period,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalUsers,
          totalActiveTime,
          avgProductivityScore: Math.round(avgProductivityScore * 100) / 100,
          totalSessions: sessions.length,
        },
        departmentAnalytics,
        topPerformers,
      };
    } catch (error) {
      console.error('Failed to get productivity analytics:', error);
      throw new BadRequestException('Failed to retrieve productivity analytics');
    }
  }

  // Screenshot Gallery for Admin
  async getScreenshotGallery(companyId: string, dto: GetScreenshotGalleryDto, isAdmin: boolean = false) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      const whereClause: any = {};

      // Filter by date range
      if (dto.startDate && dto.endDate) {
        whereClause.captured_at = {
          gte: new Date(dto.startDate),
          lte: new Date(dto.endDate),
        };
      }

      // Filter by specific user
      if (dto.userId) {
        whereClause.session = {
          user_id: dto.userId,
        };
      }

      // Filter by department
      if (dto.department) {
        whereClause.session = {
          ...whereClause.session,
          user: {
            employee_profile: {
              department: dto.department,
            },
          },
        };
      }

      const skip = ((dto.page || 1) - 1) * (dto.limit || 20);

      const [screenshots, total] = await Promise.all([
        this.prisma.attitude_screenshot.findMany({
          where: whereClause,
          include: {
            session: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    title: true,
                    employee_profile: {
                      select: {
                        department: true,
                        emp_no: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { captured_at: 'desc' },
          skip,
          take: dto.limit || 20,
        }),
        this.prisma.attitude_screenshot.count({ where: whereClause }),
      ]);

      return {
        data: screenshots.map(screenshot => ({
          id: screenshot.id,
          session_id: screenshot.session_id,
          file_url: screenshot.file_url,
          thumbnail_url: screenshot.thumbnail_url,
          captured_at: screenshot.captured_at,
          is_blurred: screenshot.is_blurred,
          metadata: screenshot.metadata,
          session: {
            user: {
              id: screenshot.session.user.id,
              name: screenshot.session.user.name,
              email: screenshot.session.user.email,
              title: screenshot.session.user.title || 'Employee',
              department: screenshot.session.user.employee_profile?.department,
            },
          },
        })),
        screenshots: screenshots.map(screenshot => ({
          id: screenshot.id,
          session_id: screenshot.session_id,
          file_url: screenshot.file_url,
          thumbnail_url: screenshot.thumbnail_url,
          captured_at: screenshot.captured_at,
          is_blurred: screenshot.is_blurred,
          metadata: screenshot.metadata,
          session: {
            user: {
              id: screenshot.session.user.id,
              name: screenshot.session.user.name,
              email: screenshot.session.user.email,
              title: screenshot.session.user.title || 'Employee',
              department: screenshot.session.user.employee_profile?.department,
            },
          },
        })),
        pagination: {
          total,
          page: dto.page || 1,
          limit: dto.limit || 20,
          totalPages: Math.ceil(total / (dto.limit || 20)),
        },
      };
    } catch (error) {
      console.error('Failed to get screenshot gallery:', error);
      throw new BadRequestException('Failed to retrieve screenshot gallery');
    }
  }

  // Update Screenshot Blur Status (Admin)
  async updateScreenshotBlurStatus(companyId: string, screenshotId: string, isBlurred: boolean, isAdmin: boolean = false) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      const screenshot = await this.prisma.attitude_screenshot.findUnique({
        where: { id: screenshotId },
        include: { session: true },
      });

      if (!screenshot) {
        throw new NotFoundException('Screenshot not found');
      }

      const updatedScreenshot = await this.prisma.attitude_screenshot.update({
        where: { id: screenshotId },
        data: {
          is_blurred: isBlurred,
        },
      });

      return {
        message: `Screenshot ${isBlurred ? 'blurred' : 'unblurred'} successfully`,
        screenshot: {
          id: updatedScreenshot.id,
          isBlurred: updatedScreenshot.is_blurred,
        },
      };
    } catch (error) {
      console.error('Failed to update screenshot blur status:', error);
      throw new BadRequestException('Failed to update screenshot status');
    }
  }

  // Live Monitoring (Admin)
  async getLiveMonitoringData(companyId: string, dto: LiveMonitoringDto, isAdmin: boolean = false) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      const whereClause: any = {};

      if (dto.userIds && dto.userIds.length > 0) {
        whereClause.id = { in: dto.userIds };
      }

      if (dto.department) {
        whereClause.employee_profile = {
          department: dto.department,
        };
      }

      // Get users with their latest activity
      const users = await this.prisma.auth_user.findMany({
        where: {
          ...whereClause,
          org_unit: {
            company_id: companyId,
          },
        },
        include: {
          employee_profile: true,
          attitude_sessions: {
            where: {
              date: {
                gte: startOfDay(new Date()),
                lte: endOfDay(new Date()),
              },
            },
            include: {
              app_usage: {
                orderBy: { end_time: 'desc' },
                take: 1,
              },
              screenshots: dto.includeScreenshots ? {
                orderBy: { captured_at: 'desc' },
                take: 3,
              } : false,
            },
            orderBy: { updated_at: 'desc' },
            take: 1,
          },
        },
      });

      const monitoringData = users.map(user => {
        const latestSession = user.attitude_sessions[0];
        const latestApp = latestSession?.app_usage[0];

        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            department: user.employee_profile?.department,
            emp_no: user.employee_profile?.emp_no,
          },
          status: {
            isOnline: latestSession?.last_agent_heartbeat && 
                     (Date.now() - latestSession.last_agent_heartbeat.getTime()) < 5 * 60 * 1000, // 5 minutes
            lastActivity: latestSession?.last_agent_heartbeat,
            sessionStatus: latestSession?.status,
          },
          currentActivity: latestApp ? {
            applicationName: latestApp.app_name,
            windowTitle: latestApp.window_title,
            isProductive: latestApp.is_productive,
            startTime: latestApp.start_time,
            category: latestApp.app_category,
          } : null,
          todayStats: latestSession ? {
            activeTime: latestSession.total_active_time,
            idleTime: latestSession.total_idle_time,
            productivityScore: latestSession.productivity_score,
          } : null,
          recentScreenshots: dto.includeScreenshots ? latestSession?.screenshots?.map(s => ({
            id: s.id,
            capturedAt: s.captured_at,
            fileUrl: s.file_url,
            isBlurred: s.is_blurred,
          })) : undefined,
        };
      });

      return {
        timestamp: new Date().toISOString(),
        userCount: users.length,
        onlineCount: monitoringData.filter(u => u.status.isOnline).length,
        users: monitoringData,
      };
    } catch (error) {
      console.error('Failed to get live monitoring data:', error);
      throw new BadRequestException('Failed to retrieve live monitoring data');
    }
  }

  // Get User's Screenshots
  async getUserScreenshots(userId: string, companyId: string, startDate?: string, endDate?: string) {
    try {
      const whereClause: any = {
        session: {
          user_id: userId,
        },
      };

      if (startDate && endDate) {
        whereClause.captured_at = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const screenshots = await this.prisma.attitude_screenshot.findMany({
        where: whereClause,
        select: {
          id: true,
          file_url: true,
          thumbnail_url: true,
          captured_at: true,
          is_blurred: true,
          metadata: true,
        },
        orderBy: { captured_at: 'desc' },
        take: 100, // Limit to latest 100 screenshots
      });

      return screenshots;
    } catch (error) {
      console.error('Failed to get user screenshots:', error);
      throw new BadRequestException('Failed to retrieve screenshots');
    }
  }

  // Enhanced Desktop Agent Features
  async submitProcessData(userId: string, companyId: string, data: any) {
    try {
      // Store process data - implement based on your schema
      return { success: true, message: 'Process data submitted successfully' };
    } catch (error) {
      console.error('Failed to submit process data:', error);
      throw new BadRequestException('Failed to submit process data');
    }
  }

  async submitNetworkData(userId: string, companyId: string, data: any) {
    try {
      // Store network data - implement based on your schema
      return { success: true, message: 'Network data submitted successfully' };
    } catch (error) {
      console.error('Failed to submit network data:', error);
      throw new BadRequestException('Failed to submit network data');
    }
  }

  async submitIdleEvent(userId: string, companyId: string, data: any) {
    try {
      // Store idle event data - implement based on your schema
      return { success: true, message: 'Idle event submitted successfully' };
    } catch (error) {
      console.error('Failed to submit idle event:', error);
      throw new BadRequestException('Failed to submit idle event');
    }
  }

  async submitIdleSession(userId: string, companyId: string, data: any) {
    try {
      // Store idle session data - implement based on your schema
      return { success: true, message: 'Idle session submitted successfully' };
    } catch (error) {
      console.error('Failed to submit idle session:', error);
      throw new BadRequestException('Failed to submit idle session');
    }
  }

  async getIdleStats(userId: string, companyId: string, days: number = 7) {
    try {
      // Return idle statistics - implement based on your schema
      return { 
        success: true,
        data: {
          totalIdleTime: 0,
          averageIdleTime: 0,
          longestIdlePeriod: 0,
          days
        }
      };
    } catch (error) {
      console.error('Failed to get idle stats:', error);
      throw new BadRequestException('Failed to retrieve idle statistics');
    }
  }

  async getProcessAnalytics(companyId: string, userId?: string, startDate?: string, endDate?: string) {
    try {
      // Return process analytics - implement based on your schema
      return {
        success: true,
        data: {
          topApplications: [],
          productivityScore: 0,
          totalActiveTime: 0
        }
      };
    } catch (error) {
      console.error('Failed to get process analytics:', error);
      throw new BadRequestException('Failed to retrieve process analytics');
    }
  }

  async getNetworkAnalytics(companyId: string, userId?: string, startDate?: string, endDate?: string) {
    try {
      // Return network analytics - implement based on your schema
      return {
        success: true,
        data: {
          locations: [],
          networks: [],
          workingTime: 0
        }
      };
    } catch (error) {
      console.error('Failed to get network analytics:', error);
      throw new BadRequestException('Failed to retrieve network analytics');
    }
  }

  async getAdminSessions(companyId: string, dateFilter: 'today' | 'week' | 'month' = 'today', limit: number = 100) {
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        default:
          startDate = startOfDay(now);
      }

      // Get active sessions with user information
      const sessions = await this.prisma.attitude_session.findMany({
        where: {
          user: {
            org_unit: {
              company_id: companyId,
            },
          },
          date: {
            gte: startDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              title: true,
              employee_profile: {
                select: {
                  department: true,
                  emp_no: true,
                },
              },
            },
          },
        },
        orderBy: {
          updated_at: 'desc',
        },
        take: limit,
      });

      const sessionsWithStatus = sessions.map(session => {
        return {
          id: session.id,
          user: {
            id: session.user?.id || 'unknown',
            name: session.user?.name || 'Unknown User',
            email: session.user?.email || '',
            title: session.user?.title || 'Employee',
            department: session.user?.employee_profile?.department || 'Unknown',
          },
          status: session.status,
          loginTime: session.login_time,
          logoutTime: session.logout_time,
          lastHeartbeat: session.last_agent_heartbeat,
          date: session.date,
        };
      });

      return {
        data: sessionsWithStatus,
        totalCount: sessionsWithStatus.length,
        activeUsers: sessionsWithStatus.filter(s => s.status === 'ACTIVE').length,
        period: dateFilter,
      };
    } catch (error) {
      console.error('Failed to get admin sessions:', error);
      throw new BadRequestException('Failed to retrieve admin sessions');
    }
  }

  // App Whitelist Management
  async getAppWhitelist(companyId: string) {
    try {
      // 일단 기본 앱 목록을 반환
      return [
        { 
          id: '1', 
          app_name: 'Visual Studio Code', 
          category: 'PRODUCTIVITY', 
          is_productive: true, 
          description: '개발 도구',
          company_id: companyId 
        },
        { 
          id: '2', 
          app_name: 'Chrome', 
          category: 'BROWSER', 
          is_productive: true, 
          description: '웹 브라우저',
          company_id: companyId 
        },
        { 
          id: '3', 
          app_name: 'Slack', 
          category: 'COMMUNICATION', 
          is_productive: true, 
          description: '업무 메신저',
          company_id: companyId 
        },
        { 
          id: '4', 
          app_name: 'Microsoft Teams', 
          category: 'COMMUNICATION', 
          is_productive: true, 
          description: '협업 도구',
          company_id: companyId 
        },
        { 
          id: '5', 
          app_name: 'Notion', 
          category: 'PRODUCTIVITY', 
          is_productive: true, 
          description: '문서 도구',
          company_id: companyId 
        }
      ];
    } catch (error) {
      console.error('Failed to get app whitelist:', error);
      throw new BadRequestException('Failed to retrieve app whitelist');
    }
  }

  async addAppToWhitelist(companyId: string, data: any) {
    try {
      // 실제 구현에서는 데이터베이스에 저장
      const newApp = {
        id: Date.now().toString(),
        ...data,
        company_id: companyId,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      return {
        success: true,
        data: newApp,
        message: 'App added to whitelist successfully'
      };
    } catch (error) {
      console.error('Failed to add app to whitelist:', error);
      throw new BadRequestException('Failed to add app to whitelist');
    }
  }

  async updateAppInWhitelist(companyId: string, id: string, data: any) {
    try {
      // 실제 구현에서는 데이터베이스에서 업데이트
      const updatedApp = {
        id,
        ...data,
        company_id: companyId,
        updated_at: new Date()
      };
      
      return {
        success: true,
        data: updatedApp,
        message: 'App updated successfully'
      };
    } catch (error) {
      console.error('Failed to update app in whitelist:', error);
      throw new BadRequestException('Failed to update app in whitelist');
    }
  }

  async deleteAppFromWhitelist(companyId: string, id: string) {
    try {
      // 실제 구현에서는 데이터베이스에서 삭제
      return {
        success: true,
        message: 'App deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete app from whitelist:', error);
      throw new BadRequestException('Failed to delete app from whitelist');
    }
  }

  // Attitude Settings Management
  async getAttitudeSettings(companyId: string) {
    try {
      // 기본 설정 반환
      return {
        company_id: companyId,
        screenshotInterval: 10, // 10분
        activityInterval: 30, // 30초
        idleTimeout: 5, // 5분
        workingHours: {
          start: '09:00',
          end: '18:00'
        },
        captureSettings: {
          quality: 70,
          format: 'jpeg',
          blurSensitive: true,
          multiMonitor: false
        },
        features: {
          screenshot: true,
          activity: true,
          appUsage: true,
          webUsage: true,
          idleDetection: true
        },
        updated_at: new Date()
      };
    } catch (error) {
      console.error('Failed to get attitude settings:', error);
      throw new BadRequestException('Failed to retrieve attitude settings');
    }
  }

  async updateAttitudeSettings(companyId: string, settings: any) {
    try {
      // 실제 구현에서는 데이터베이스에 저장
      const updatedSettings = {
        company_id: companyId,
        ...settings,
        updated_at: new Date()
      };
      
      return {
        success: true,
        data: updatedSettings,
        message: 'Attitude settings updated successfully'
      };
    } catch (error) {
      console.error('Failed to update attitude settings:', error);
      throw new BadRequestException('Failed to update attitude settings');
    }
  }

  // Admin Screenshot Management Methods
  async deleteScreenshotsBatch(companyId: string, screenshotIds: string[], isAdmin: boolean = false) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      if (!screenshotIds || screenshotIds.length === 0) {
        throw new BadRequestException('Screenshot IDs are required');
      }

      // Verify screenshots belong to the company
      const screenshots = await this.prisma.attitude_screenshot.findMany({
        where: {
          id: { in: screenshotIds },
          session: {
            user: {
              org_unit: {
                company_id: companyId,
              },
            },
          },
        },
        include: {
          session: {
            include: {
              user: {
                include: {
                  org_unit: true,
                },
              },
            },
          },
        },
      });

      if (screenshots.length !== screenshotIds.length) {
        throw new BadRequestException('Some screenshots not found or access denied');
      }

      // Delete screenshots
      const deleteResult = await this.prisma.attitude_screenshot.deleteMany({
        where: {
          id: { in: screenshotIds },
        },
      });

      return {
        success: true,
        message: `${deleteResult.count} screenshot(s) deleted successfully`,
        deletedCount: deleteResult.count,
      };
    } catch (error) {
      console.error('Failed to delete screenshots batch:', error);
      throw new BadRequestException('Failed to delete screenshots');
    }
  }

  async deleteUserScreenshots(
    companyId: string, 
    userId: string, 
    filters: { timeSlot?: string; dateFilter?: 'today' | 'week' | 'month' },
    isAdmin: boolean = false
  ) {
    try {
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      // Verify user belongs to company
      const user = await this.prisma.auth_user.findFirst({
        where: { 
          id: userId,
          org_unit: {
            company_id: companyId,
          },
        },
        include: {
          org_unit: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found or access denied');
      }

      // Build date filters
      const now = new Date();
      let startDate: Date, endDate: Date;

      switch (filters.dateFilter) {
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default: // 'today'
          startDate = startOfDay(now);
          endDate = endOfDay(now);
      }

      // Build where clause for screenshots
      const whereClause: any = {
        session: {
          user_id: userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      };

      // Add time slot filter if provided
      if (filters.timeSlot) {
        const hour = parseInt(filters.timeSlot.split(':')[0]);
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour, 59, 59, 999);

        whereClause.captured_at = {
          gte: hourStart,
          lte: hourEnd,
        };
      }

      // Count screenshots to be deleted
      const screenshotCount = await this.prisma.attitude_screenshot.count({
        where: whereClause,
      });

      // Delete screenshots
      const deleteResult = await this.prisma.attitude_screenshot.deleteMany({
        where: whereClause,
      });

      return {
        success: true,
        message: `${deleteResult.count} screenshot(s) deleted successfully for user ${user.name}`,
        deletedCount: deleteResult.count,
        filters: {
          userId,
          timeSlot: filters.timeSlot,
          dateFilter: filters.dateFilter,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      };
    } catch (error) {
      console.error('Failed to delete user screenshots:', error);
      throw new BadRequestException('Failed to delete user screenshots');
    }
  }
}