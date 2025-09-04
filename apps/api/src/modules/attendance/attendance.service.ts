import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import {
  CheckInDto,
  CheckOutDto,
  AttendanceHistoryDto,
  AttendanceAdjustmentDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, checkInDto: CheckInDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        date_key: {
          gte: today,
        }
      }
    });

    if (existingAttendance && existingAttendance.check_in_at) {
      throw new BadRequestException('Already checked in today');
    }

    let locationVerified = false;
    let requiresApproval = false;
    let status = 'NORMAL';

    // Get user's base location for verification
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      include: {
        employee_profile: {
          include: {
            base_location: true
          }
        }
      }
    });

    if (user?.employee_profile?.base_location) {
      const distance = this.calculateDistance(
        checkInDto.location.latitude,
        checkInDto.location.longitude,
        user.employee_profile.base_location.lat,
        user.employee_profile.base_location.lng
      );
      locationVerified = distance <= user.employee_profile.base_location.radius_m;
      
      if (!locationVerified) {
        status = checkInDto.isRemote ? 'REMOTE' : 'OFFSITE';
        requiresApproval = !checkInDto.isRemote;
      }
    }

    const attendanceData = {
      user_id: userId,
      date_key: today,
      check_in_at: new Date(),
      check_in_loc: {
        lat: checkInDto.location.latitude,
        lng: checkInDto.location.longitude,
        accuracy: checkInDto.location.accuracy,
        verified: locationVerified
      },
      notes: checkInDto.reasonText,
      status,
    };

    if (existingAttendance) {
      return this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });
    } else {
      return this.prisma.attendance.create({
        data: attendanceData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });
    }
  }

  async checkOut(userId: string, checkOutDto: CheckOutDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        date_key: {
          gte: today,
        }
      }
    });

    if (!attendance || !attendance.check_in_at) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.check_out_at) {
      throw new BadRequestException('Already checked out today');
    }

    let locationVerified = false;
    
    // Get user's base location for verification
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      include: {
        employee_profile: {
          include: {
            base_location: true
          }
        }
      }
    });

    if (user?.employee_profile?.base_location) {
      const distance = this.calculateDistance(
        checkOutDto.location.latitude,
        checkOutDto.location.longitude,
        user.employee_profile.base_location.lat,
        user.employee_profile.base_location.lng
      );
      locationVerified = distance <= user.employee_profile.base_location.radius_m;
    }

    const checkOutTime = new Date();
    const workingMinutes = Math.floor((checkOutTime.getTime() - attendance.check_in_at.getTime()) / (1000 * 60));

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out_at: checkOutTime,
        check_out_loc: {
          lat: checkOutDto.location.latitude,
          lng: checkOutDto.location.longitude,
          accuracy: checkOutDto.location.accuracy,
          verified: locationVerified
        },
        work_minutes: workingMinutes,
        notes: attendance.notes ? `${attendance.notes} | ${checkOutDto.reasonText || ''}` : checkOutDto.reasonText,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
  }

  async getAttendanceHistory(userId: string, historyDto: AttendanceHistoryDto) {
    const whereClause: any = { user_id: userId };

    if (historyDto.startDate && historyDto.endDate) {
      whereClause.date_key = {
        gte: new Date(historyDto.startDate),
        lte: new Date(historyDto.endDate),
      };
    }

    if (historyDto.status) {
      whereClause.status = historyDto.status;
    }

    const skip = ((historyDto.page || 1) - 1) * (historyDto.limit || 20);
    const take = historyDto.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { date_key: 'desc' },
        skip,
        take
      }),
      this.prisma.attendance.count({ where: whereClause })
    ]);

    return {
      data,
      pagination: {
        total,
        page: historyDto.page || 1,
        limit: historyDto.limit || 20,
        totalPages: Math.ceil(total / (historyDto.limit || 20))
      }
    };
  }

  async getCurrentAttendanceStatus(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        date_key: {
          gte: today,
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // Get working hours policy (simplified - you might want to get from company policy)
    const workingHours = {
      start_time: '09:00',
      end_time: '18:00',
      break_duration_minutes: 60
    };

    return {
      isCheckedIn: todayAttendance?.check_in_at && !todayAttendance?.check_out_at,
      todayAttendance,
      workingHours
    };
  }

  async createAdjustmentRequest(userId: string, adjustmentDto: AttendanceAdjustmentDto) {
    return this.prisma.attendance_request.create({
      data: {
        user_id: userId,
        request_date: new Date(adjustmentDto.date),
        request_type: adjustmentDto.adjustmentType,
        check_in_time: adjustmentDto.checkInTime ? new Date(adjustmentDto.checkInTime) : null,
        check_out_time: adjustmentDto.checkOutTime ? new Date(adjustmentDto.checkOutTime) : null,
        reason_text: adjustmentDto.reason,
        attach_urls: adjustmentDto.attachments || [],
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
  }

  async getUserAdjustmentRequests(userId: string, status?: string) {
    const whereClause: any = { user_id: userId };
    if (status) {
      whereClause.status = status;
    }

    return this.prisma.attendance_request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getAllAdjustmentRequests(status?: string) {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    return this.prisma.attendance_request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async approveAdjustmentRequest(requestId: string, adminId: string) {
    const request = await this.prisma.attendance_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('Adjustment request not found');
    }

    return this.prisma.attendance_request.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approved_by: adminId,
        approved_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
  }

  async rejectAdjustmentRequest(requestId: string, adminId: string, reason: string) {
    const request = await this.prisma.attendance_request.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('Adjustment request not found');
    }

    return this.prisma.attendance_request.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        approved_by: adminId,
        approved_at: new Date(),
        rejection_reason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
  }

  async getAttendanceStatistics(userId: string, period: string = 'month') {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }

    const records = await this.prisma.attendance.findMany({
      where: {
        user_id: userId,
        date_key: {
          gte: startDate,
          lte: endDate,
        }
      },
      orderBy: { date_key: 'desc' }
    });

    const totalDays = records.length;
    const totalWorkingMinutes = records.reduce((sum, record) => sum + (record.work_minutes || 0), 0);
    const totalWorkingHours = Math.floor(totalWorkingMinutes / 60);
    const avgWorkingHours = totalDays > 0 ? totalWorkingHours / totalDays : 0;

    const onTimeCheckins = records.filter(record => {
      if (!record.check_in_at) return false;
      const checkInHour = record.check_in_at.getHours();
      return checkInHour <= 9; // Assuming 9 AM is the standard start time
    }).length;

    const statusCounts = records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      period,
      totalDays,
      totalWorkingHours,
      avgWorkingHours: Math.round(avgWorkingHours * 100) / 100,
      onTimeRate: totalDays > 0 ? Math.round((onTimeCheckins / totalDays) * 100) : 0,
      statusBreakdown: statusCounts,
      recentRecords: records.slice(0, 5), // Last 5 records
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}