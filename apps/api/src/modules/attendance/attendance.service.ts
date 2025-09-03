import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, data: {
    latitude: number;
    longitude: number;
    location_id?: string;
    note?: string;
    face_image?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        created_at: {
          gte: today,
        }
      }
    });

    if (existingAttendance && existingAttendance.check_in_at) {
      throw new BadRequestException('Already checked in today');
    }

    let locationVerified = false;
    let companyLocation = null;

    if (data.location_id) {
      companyLocation = await this.prisma.company_location.findUnique({
        where: { id: data.location_id }
      });

      if (companyLocation) {
        const distance = this.calculateDistance(
          data.latitude,
          data.longitude,
          companyLocation.lat,
          companyLocation.lng
        );
        locationVerified = distance <= companyLocation.radius_m;
      }
    }

    const attendanceData = {
      user_id: userId,
      date_key: today,
      check_in_at: new Date(),
      check_in_loc: {
        lat: data.latitude,
        lng: data.longitude,
        verified: locationVerified,
        location_id: data.location_id
      },
      notes: data.note,
      status: locationVerified ? 'NORMAL' : 'OFFSITE',
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

  async checkOut(userId: string, data: {
    latitude: number;
    longitude: number;
    location_id?: string;
    note?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        created_at: {
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
    if (data.location_id) {
      const companyLocation = await this.prisma.company_location.findUnique({
        where: { id: data.location_id }
      });

      if (companyLocation) {
        const distance = this.calculateDistance(
          data.latitude,
          data.longitude,
          companyLocation.lat,
          companyLocation.lng
        );
        locationVerified = distance <= companyLocation.radius_m;
      }
    }

    const checkOutTime = new Date();
    const workingMinutes = Math.floor((checkOutTime.getTime() - attendance.check_in_at.getTime()) / (1000 * 60));

    return this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out_at: checkOutTime,
        check_out_loc: {
          lat: data.latitude,
          lng: data.longitude,
          verified: locationVerified,
          location_id: data.location_id
        },
        work_minutes: workingMinutes,
        notes: attendance.notes ? `${attendance.notes} | ${data.note || ''}` : data.note,
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

  async getAttendanceRecords(userId: string, startDate?: string, endDate?: string) {
    const whereClause: any = { user_id: userId };

    if (startDate && endDate) {
      whereClause.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.prisma.attendance.findMany({
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

  async getTodayAttendance(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        created_at: {
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
  }

  async createAttendanceRequest(userId: string, data: {
    date: string;
    type: 'CHECK_IN' | 'CHECK_OUT' | 'ADJUST';
    requested_time: string;
    reason: string;
    supporting_documents?: string[];
  }) {
    return this.prisma.attendance_request.create({
      data: {
        user_id: userId,
        target_at: new Date(data.requested_time),
        request_type: data.type,
        reason_text: data.reason,
        attach_urls: data.supporting_documents || [],
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

  async getAttendanceRequests(userId: string) {
    return this.prisma.attendance_request.findMany({
      where: { user_id: userId },
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

  async getAttendanceStats(userId: string, month?: string) {
    const startOfMonth = month ? new Date(month) : new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const records = await this.prisma.attendance.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startOfMonth,
          lt: endOfMonth,
        }
      }
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

    return {
      totalDays,
      totalWorkingHours,
      avgWorkingHours: Math.round(avgWorkingHours * 100) / 100,
      onTimeRate: totalDays > 0 ? Math.round((onTimeCheckins / totalDays) * 100) : 0,
      records: records.slice(0, 5), // Last 5 records
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