import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { 
  UpdateFeatureConfigDto, 
  UpdateMenuPermissionsDto, 
  UpdateFeatureLimitsDto,
  MenuPermissionDto,
  FeatureLimitDto 
} from './dto/feature-config.dto';

@Injectable()
export class FeatureConfigService {
  constructor(private prisma: PrismaService) {}

  async getFeatureConfig(companyId: string) {
    let config = await this.prisma.company_feature_config.findUnique({
      where: { company_id: companyId },
      include: {
        menu_permissions: true
      }
    });

    if (!config) {
      // Create default config if it doesn't exist
      config = await this.createDefaultConfig(companyId);
    }

    return config;
  }

  async updateFeatureConfig(companyId: string, dto: UpdateFeatureConfigDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if config exists
    const existingConfig = await this.prisma.company_feature_config.findUnique({
      where: { company_id: companyId }
    });

    if (existingConfig) {
      return await this.prisma.company_feature_config.update({
        where: { company_id: companyId },
        data: dto,
        include: {
          menu_permissions: true
        }
      });
    } else {
      return await this.prisma.company_feature_config.create({
        data: {
          company_id: companyId,
          ...dto
        },
        include: {
          menu_permissions: true
        }
      });
    }
  }

  async getMenuPermissions(companyId: string, role?: string) {
    const config = await this.getFeatureConfig(companyId);

    let permissions = await this.prisma.company_menu_permission.findMany({
      where: {
        config_id: config.id,
        ...(role && { role })
      },
      orderBy: [
        { role: 'asc' },
        { menu_key: 'asc' }
      ]
    });

    if (permissions.length === 0) {
      // Create default permissions if none exist
      await this.createDefaultMenuPermissions(config.id);
      permissions = await this.prisma.company_menu_permission.findMany({
        where: {
          config_id: config.id,
          ...(role && { role })
        },
        orderBy: [
          { role: 'asc' },
          { menu_key: 'asc' }
        ]
      });
    }

    return permissions;
  }

  async updateMenuPermissions(companyId: string, dto: UpdateMenuPermissionsDto) {
    const config = await this.getFeatureConfig(companyId);

    const updatePromises = dto.permissions.map(permission => {
      return this.prisma.company_menu_permission.upsert({
        where: {
          config_id_role_menu_key: {
            config_id: config.id,
            role: permission.role,
            menu_key: permission.menu_key
          }
        },
        update: {
          can_view: permission.can_view ?? false,
          can_create: permission.can_create ?? false,
          can_edit: permission.can_edit ?? false,
          can_delete: permission.can_delete ?? false,
          can_approve: permission.can_approve ?? false,
          can_export: permission.can_export ?? false,
          scope: permission.scope ?? 'SELF',
          custom_rules: permission.custom_rules
        },
        create: {
          config_id: config.id,
          role: permission.role,
          menu_key: permission.menu_key,
          can_view: permission.can_view ?? false,
          can_create: permission.can_create ?? false,
          can_edit: permission.can_edit ?? false,
          can_delete: permission.can_delete ?? false,
          can_approve: permission.can_approve ?? false,
          can_export: permission.can_export ?? false,
          scope: permission.scope ?? 'SELF',
          custom_rules: permission.custom_rules
        }
      });
    });

    await Promise.all(updatePromises);

    return await this.getMenuPermissions(companyId);
  }

  async getFeatureLimits(companyId: string) {
    return await this.prisma.company_feature_limit.findMany({
      where: { company_id: companyId },
      orderBy: { feature_key: 'asc' }
    });
  }

  async updateFeatureLimits(companyId: string, dto: UpdateFeatureLimitsDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const updatePromises = dto.limits.map(limit => {
      return this.prisma.company_feature_limit.upsert({
        where: {
          company_id_feature_key: {
            company_id: companyId,
            feature_key: limit.feature_key
          }
        },
        update: {
          limit_value: limit.limit_value,
          reset_period: limit.reset_period,
          warning_threshold: limit.warning_threshold
        },
        create: {
          company_id: companyId,
          feature_key: limit.feature_key,
          limit_value: limit.limit_value,
          reset_period: limit.reset_period,
          warning_threshold: limit.warning_threshold,
          current_usage: 0
        }
      });
    });

    await Promise.all(updatePromises);

    return await this.getFeatureLimits(companyId);
  }

  async checkFeatureLimit(companyId: string, featureKey: string): Promise<boolean> {
    const limit = await this.prisma.company_feature_limit.findUnique({
      where: {
        company_id_feature_key: {
          company_id: companyId,
          feature_key: featureKey
        }
      }
    });

    if (!limit) {
      return true; // No limit set, allow usage
    }

    // Check if limit needs to be reset
    if (limit.reset_period && limit.last_reset_at) {
      const now = new Date();
      const lastReset = new Date(limit.last_reset_at);
      let shouldReset = false;

      switch (limit.reset_period) {
        case 'DAILY':
          shouldReset = now.toDateString() !== lastReset.toDateString();
          break;
        case 'WEEKLY':
          const weekDiff = Math.floor((now.getTime() - lastReset.getTime()) / (7 * 24 * 60 * 60 * 1000));
          shouldReset = weekDiff > 0;
          break;
        case 'MONTHLY':
          shouldReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
          break;
        case 'YEARLY':
          shouldReset = now.getFullYear() !== lastReset.getFullYear();
          break;
      }

      if (shouldReset) {
        await this.prisma.company_feature_limit.update({
          where: { id: limit.id },
          data: {
            current_usage: 0,
            last_reset_at: now,
            notification_sent: false
          }
        });
        return true;
      }
    }

    return limit.current_usage < limit.limit_value;
  }

  async incrementFeatureUsage(companyId: string, featureKey: string): Promise<void> {
    const limit = await this.prisma.company_feature_limit.findUnique({
      where: {
        company_id_feature_key: {
          company_id: companyId,
          feature_key: featureKey
        }
      }
    });

    if (!limit) {
      return; // No limit tracking
    }

    const newUsage = limit.current_usage + 1;
    const usagePercentage = (newUsage / limit.limit_value) * 100;

    // Check if warning threshold is reached
    const shouldSendWarning = limit.warning_threshold && 
                             usagePercentage >= limit.warning_threshold && 
                             !limit.notification_sent;

    await this.prisma.company_feature_limit.update({
      where: { id: limit.id },
      data: {
        current_usage: newUsage,
        ...(shouldSendWarning && { notification_sent: true })
      }
    });

    if (shouldSendWarning) {
      // TODO: Send notification to company admin
      console.log(`Warning: Company ${companyId} has reached ${usagePercentage}% of ${featureKey} limit`);
    }
  }

  private async createDefaultConfig(companyId: string) {
    return await this.prisma.company_feature_config.create({
      data: {
        company_id: companyId,
        // All features enabled by default
        attendance_enabled: true,
        leave_enabled: true,
        approval_enabled: true,
        hr_community_enabled: true,
        calendar_enabled: true,
        geofence_enabled: true,
        face_recognition_enabled: false,
        qr_checkin_enabled: false,
        overtime_enabled: true,
        remote_work_enabled: true,
        annual_leave_enabled: true,
        sick_leave_enabled: true,
        special_leave_enabled: true,
        leave_calendar_enabled: true,
        auto_approval_enabled: false,
        dynamic_forms_enabled: true,
        parallel_approval_enabled: false,
        deputy_approval_enabled: true,
        bulk_approval_enabled: true,
        company_notice_enabled: true,
        team_board_enabled: true,
        survey_enabled: true,
        anonymous_post_enabled: false,
        ai_assistant_enabled: false,
        analytics_enabled: true,
        custom_reports_enabled: false,
        api_access_enabled: false
      },
      include: {
        menu_permissions: true
      }
    });
  }

  private async createDefaultMenuPermissions(configId: string) {
    const menus = ['attendance', 'leave', 'approval', 'hr_community', 'calendar', 'reports', 'settings'];
    const roles = ['ADMIN', 'HR_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];

    const permissions = [];

    for (const menu of menus) {
      for (const role of roles) {
        let permission: any = {
          config_id: configId,
          role,
          menu_key: menu,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: false,
          scope: 'SELF'
        };

        // Set default permissions based on role
        switch (role) {
          case 'ADMIN':
            permission = {
              ...permission,
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: true,
              can_approve: true,
              can_export: true,
              scope: 'COMPANY'
            };
            break;
          case 'HR_MANAGER':
            permission = {
              ...permission,
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: menu !== 'settings',
              can_approve: menu !== 'settings',
              can_export: true,
              scope: 'COMPANY'
            };
            break;
          case 'TEAM_LEADER':
            permission = {
              ...permission,
              can_view: true,
              can_create: menu !== 'settings',
              can_edit: menu !== 'settings',
              can_delete: false,
              can_approve: menu === 'approval' || menu === 'leave',
              can_export: menu === 'reports',
              scope: 'TEAM'
            };
            break;
          case 'EMPLOYEE':
            permission = {
              ...permission,
              can_view: menu !== 'settings' && menu !== 'reports',
              can_create: menu === 'leave' || menu === 'approval' || menu === 'hr_community',
              can_edit: false,
              can_delete: false,
              can_approve: false,
              can_export: false,
              scope: 'SELF'
            };
            break;
        }

        permissions.push(permission);
      }
    }

    await this.prisma.company_menu_permission.createMany({
      data: permissions
    });
  }

  async checkMenuPermission(
    companyId: string, 
    userId: string, 
    menuKey: string, 
    action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  ): Promise<boolean> {
    const user = await this.prisma.auth_user.findUnique({
      where: { id: userId },
      include: { org_unit: true }
    });

    if (!user) {
      return false;
    }

    const config = await this.getFeatureConfig(companyId);
    
    const permission = await this.prisma.company_menu_permission.findUnique({
      where: {
        config_id_role_menu_key: {
          config_id: config.id,
          role: user.role,
          menu_key: menuKey
        }
      }
    });

    if (!permission) {
      return false;
    }

    const actionMap = {
      'view': permission.can_view,
      'create': permission.can_create,
      'edit': permission.can_edit,
      'delete': permission.can_delete,
      'approve': permission.can_approve,
      'export': permission.can_export
    };

    return actionMap[action] || false;
  }
}
