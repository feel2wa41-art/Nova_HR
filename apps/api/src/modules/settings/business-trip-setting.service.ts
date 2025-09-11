import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBusinessTripSettingDto, UpdateBusinessTripSettingDto, UserGrade, ExpenseLimitDto } from './business-trip-setting.dto';

@Injectable()
export class BusinessTripSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async createBusinessTripSetting(dto: CreateBusinessTripSettingDto, companyId: string) {
    const existingSetting = await this.prisma.business_trip_setting.findFirst({
      where: {
        company_id: companyId,
      },
    });

    if (existingSetting) {
      throw new ConflictException('Business trip setting already exists for this company');
    }

    // Convert ExpenseLimitDto[] to the format expected by grade_limits JSON field
    const gradeLimitsJson = this.convertExpenseLimitsToGradeFormat(dto.expense_limits);

    return await this.prisma.business_trip_setting.create({
      data: {
        company_id: companyId,
        auto_approval_limit: dto.auto_approval_threshold || 2000000,
        advance_payment_enabled: true,
        grade_limits: gradeLimitsJson,
      },
    });
  }

  async getBusinessTripSettings(companyId: string) {
    return await this.prisma.business_trip_setting.findMany({
      where: {
        company_id: companyId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getBusinessTripSetting(id: string, companyId: string) {
    const setting = await this.prisma.business_trip_setting.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!setting) {
      throw new NotFoundException('Business trip setting not found');
    }

    return setting;
  }

  async updateBusinessTripSetting(id: string, dto: UpdateBusinessTripSettingDto, companyId: string) {
    const existingSetting = await this.getBusinessTripSetting(id, companyId);

    const updateData: any = {};
    
    if (dto.auto_approval_threshold !== undefined) {
      updateData.auto_approval_limit = dto.auto_approval_threshold;
    }
    
    if (dto.expense_limits) {
      updateData.grade_limits = this.convertExpenseLimitsToGradeFormat(dto.expense_limits);
    }

    return await this.prisma.business_trip_setting.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteBusinessTripSetting(id: string, companyId: string) {
    await this.getBusinessTripSetting(id, companyId);

    return await this.prisma.business_trip_setting.delete({
      where: { id },
    });
  }

  async getExpenseLimitsForUser(companyId: string, userGrade: UserGrade, currencyCode?: string) {
    const settings = await this.prisma.business_trip_setting.findFirst({
      where: {
        company_id: companyId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!settings) {
      // Return default limits if no settings found
      return this.getDefaultExpenseLimits(userGrade, currencyCode || 'IDR');
    }

    const expenseLimits = settings.grade_limits as any;
    const gradeLimits = expenseLimits[userGrade] || expenseLimits['STAFF']; // Fallback to STAFF

    return {
      grade: userGrade,
      currency: currencyCode || 'IDR',
      limits: gradeLimits,
      autoApprovalThreshold: settings.auto_approval_limit ? Number(settings.auto_approval_limit) : 2000000,
      receiptRequiredThreshold: 500000, // Fixed default
    };
  }

  async validateExpense(
    companyId: string,
    userGrade: UserGrade,
    expenseType: 'accommodation' | 'meal' | 'transportation' | 'miscellaneous',
    amount: number,
    currencyCode?: string
  ) {
    const userLimits = await this.getExpenseLimitsForUser(companyId, userGrade, currencyCode);
    const dailyLimit = userLimits.limits[expenseType];

    const validation = {
      isValid: amount <= dailyLimit,
      amount,
      limit: dailyLimit,
      currency: userLimits.currency,
      grade: userGrade,
      expenseType,
      exceedsLimit: amount > dailyLimit,
      exceedsBy: amount > dailyLimit ? amount - dailyLimit : 0,
      requiresApproval: amount > userLimits.autoApprovalThreshold,
      requiresReceipt: amount > userLimits.receiptRequiredThreshold,
      message: amount <= dailyLimit 
        ? 'Expense is within allowed limits' 
        : `Expense exceeds daily limit by ${this.formatCurrency(amount - dailyLimit, userLimits.currency)}`,
    };

    return validation;
  }

  async createDefaultBusinessTripSettings(companyId: string) {
    const existingSettings = await this.prisma.business_trip_setting.findFirst({
      where: {
        company_id: companyId,
      },
    });

    if (existingSettings) {
      throw new ConflictException('Default business trip settings already exist for this company');
    }

    return await this.prisma.business_trip_setting.create({
      data: {
        company_id: companyId,
        auto_approval_limit: 2000000, // 2 juta IDR
        advance_payment_enabled: true,
        grade_limits: this.getDefaultExpenseLimitsStructure(),
      },
    });
  }

  private getDefaultExpenseLimits(userGrade: UserGrade, currencyCode: string) {
    const defaultLimits = this.getDefaultExpenseLimitsStructure();
    return {
      grade: userGrade,
      currency: currencyCode,
      limits: defaultLimits[userGrade] || defaultLimits['STAFF'],
      autoApprovalThreshold: 2000000, // 2 juta IDR
      receiptRequiredThreshold: 500000, // 500 ribu IDR
    };
  }

  private getDefaultExpenseLimitsStructure() {
    return {
      STAFF: {
        accommodation: 800000, // 800 ribu per night
        meal: 300000, // 300 ribu per day
        transportation: 500000, // 500 ribu per day
        miscellaneous: 200000, // 200 ribu per day
      },
      SENIOR: {
        accommodation: 1200000, // 1.2 juta per night
        meal: 400000, // 400 ribu per day
        transportation: 750000, // 750 ribu per day
        miscellaneous: 300000, // 300 ribu per day
      },
      MANAGER: {
        accommodation: 1800000, // 1.8 juta per night
        meal: 600000, // 600 ribu per day
        transportation: 1000000, // 1 juta per day
        miscellaneous: 500000, // 500 ribu per day
      },
      DIRECTOR: {
        accommodation: 2500000, // 2.5 juta per night
        meal: 800000, // 800 ribu per day
        transportation: 1500000, // 1.5 juta per day
        miscellaneous: 750000, // 750 ribu per day
      },
      EXECUTIVE: {
        accommodation: 3500000, // 3.5 juta per night
        meal: 1200000, // 1.2 juta per day
        transportation: 2000000, // 2 juta per day
        miscellaneous: 1000000, // 1 juta per day
      },
    };
  }

  private formatCurrency(amount: number, currencyCode: string): string {
    if (currencyCode === 'IDR') {
      // Indonesian Rupiah formatting with juta/ribu
      if (amount >= 1000000) {
        const juta = Math.floor(amount / 1000000);
        const remainder = amount % 1000000;
        if (remainder === 0) {
          return `${amount.toLocaleString('id-ID')} IDR (${juta} juta)`;
        } else if (remainder >= 1000) {
          const ribu = Math.floor(remainder / 1000);
          const sisa = remainder % 1000;
          if (sisa === 0) {
            return `${amount.toLocaleString('id-ID')} IDR (${juta} juta ${ribu} ribu)`;
          } else {
            return `${amount.toLocaleString('id-ID')} IDR (${juta} juta ${ribu} ribu ${sisa})`;
          }
        } else {
          return `${amount.toLocaleString('id-ID')} IDR (${juta} juta ${remainder})`;
        }
      } else if (amount >= 1000) {
        const ribu = Math.floor(amount / 1000);
        const remainder = amount % 1000;
        if (remainder === 0) {
          return `${amount.toLocaleString('id-ID')} IDR (${ribu} ribu)`;
        } else {
          return `${amount.toLocaleString('id-ID')} IDR (${ribu} ribu ${remainder})`;
        }
      } else {
        return `${amount.toLocaleString('id-ID')} IDR`;
      }
    } else {
      return `${amount.toLocaleString()} ${currencyCode}`;
    }
  }

  private convertExpenseLimitsToGradeFormat(expenseLimits: ExpenseLimitDto[]): any {
    const result: any = {};
    expenseLimits.forEach(limit => {
      result[limit.grade] = {
        accommodation: limit.accommodation_limit,
        meal: limit.meal_limit,
        transportation: limit.transportation_limit,
        miscellaneous: limit.miscellaneous_limit,
      };
    });
    return result;
  }
}