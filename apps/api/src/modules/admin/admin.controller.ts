import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateCompanyLocationDto,
  UpdateSystemSettingsDto,
  GetAnalyticsDto,
  GetUserListDto,
  BulkUserActionDto,
  ResetPasswordDto,
} from './dto/admin.dto';

@ApiTags('Admin Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'hr_manager')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // User Management
  @Post('users')
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createUser(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(
      req.user.id,
      req.user.companyId,
      dto,
      req.user.role === 'admin',
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user list (Admin only)' })
  @ApiResponse({ status: 200, description: 'User list retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserList(@Request() req: any, @Query() dto: GetUserListDto) {
    return this.adminService.getUserList(
      req.user.companyId,
      dto,
      req.user.role === 'admin',
    );
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(
      req.user.id,
      req.user.companyId,
      userId,
      dto,
      req.user.role === 'admin',
    );
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Request() req: any, @Param('id') userId: string) {
    return this.adminService.deleteUser(
      req.user.id,
      req.user.companyId,
      userId,
      req.user.role === 'admin',
    );
  }

  @Post('users/bulk-action')
  @ApiOperation({ summary: 'Bulk user actions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async bulkUserAction(@Request() req: any, @Body() dto: BulkUserActionDto) {
    return this.adminService.bulkUserAction(
      req.user.id,
      req.user.companyId,
      dto,
      req.user.role === 'admin',
    );
  }

  @Post('users/reset-password')
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Request() req: any, @Body() dto: ResetPasswordDto) {
    return this.adminService.resetPassword(
      req.user.id,
      req.user.companyId,
      dto,
      req.user.role === 'admin',
    );
  }

  // Company Management (Global Admin only)
  @Post('companies')
  @Roles('admin')
  @ApiOperation({ summary: 'Create company (Global Admin only)' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 403, description: 'Global admin access required' })
  async createCompany(@Request() req: any, @Body() dto: CreateCompanyDto) {
    return this.adminService.createCompany(dto, req.user.role === 'admin');
  }

  @Get('companies')
  @Roles('admin')
  @ApiOperation({ summary: 'Get company list (Global Admin only)' })
  @ApiResponse({ status: 200, description: 'Company list retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Global admin access required' })
  async getCompanyList(@Request() req: any) {
    return this.adminService.getCompanyList(req.user.role === 'admin');
  }

  @Put('companies/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update company (Global Admin only)' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 403, description: 'Global admin access required' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async updateCompany(
    @Request() req: any,
    @Param('id') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.adminService.updateCompany(companyId, dto, req.user.role === 'admin');
  }

  // Company Location Management
  @Post('companies/:id/locations')
  @ApiOperation({ summary: 'Create company location (Admin only)' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createCompanyLocation(
    @Request() req: any,
    @Param('id') companyId: string,
    @Body() dto: CreateCompanyLocationDto,
  ) {
    return this.adminService.createCompanyLocation(
      companyId,
      dto,
      req.user.role === 'admin',
      req.user.companyId,
    );
  }

  // Analytics and Reports
  @Get('analytics')
  @ApiOperation({ summary: 'Get system analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSystemAnalytics(@Request() req: any, @Query() dto: GetAnalyticsDto) {
    return this.adminService.getSystemAnalytics(
      dto,
      req.user.role === 'admin',
      req.user.companyId,
    );
  }

  // System Settings
  @Put('companies/:id/settings')
  @ApiOperation({ summary: 'Update system settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateSystemSettings(
    @Request() req: any,
    @Param('id') companyId: string,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    return this.adminService.updateSystemSettings(
      companyId,
      dto,
      req.user.role === 'admin',
      req.user.companyId,
    );
  }

  @Get('companies/:id/settings')
  @ApiOperation({ summary: 'Get system settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSystemSettings(@Request() req: any, @Param('id') companyId: string) {
    // This would be implemented to get current settings
    // For now, return a basic response
    return {
      companyId,
      message: 'Settings endpoint - to be implemented',
    };
  }

  // Dashboard Summary
  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard summary (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getDashboardSummary(@Request() req: any) {
    return this.adminService.getSystemAnalytics(
      { period: 'monthly' as any },
      req.user.role === 'admin',
      req.user.companyId,
    );
  }

  // User Activity Monitoring
  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Get user activity details (Admin only)' })
  @ApiResponse({ status: 200, description: 'User activity retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserActivity(
    @Request() req: any,
    @Param('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // This would integrate with the attitude monitoring service
    // For now, return a placeholder response
    return {
      userId,
      startDate,
      endDate,
      message: 'User activity endpoint - to be implemented',
    };
  }

  // Department Management
  @Get('departments')
  @ApiOperation({ summary: 'Get department list (Admin only)' })
  @ApiResponse({ status: 200, description: 'Department list retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getDepartments(@Request() req: any) {
    // Get unique departments from employee profiles
    const departments = await this.adminService['prisma'].employee_profile.findMany({
      where: {
        user: {
          company_id: req.user.role === 'admin' ? undefined : req.user.companyId,
        },
      },
      select: {
        department: true,
      },
      distinct: ['department'],
    });

    return departments
      .filter(d => d.department)
      .map(d => d.department)
      .sort();
  }

  // System Health Check
  @Get('health')
  @ApiOperation({ summary: 'System health check (Admin only)' })
  @ApiResponse({ status: 200, description: 'System health status' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSystemHealth(@Request() req: any) {
    const [
      totalUsers,
      totalCompanies,
      recentLogins,
    ] = await Promise.all([
      this.adminService['prisma'].auth_user.count(),
      this.adminService['prisma'].company.count(),
      this.adminService['prisma'].auth_user.count({
        where: {
          last_login_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      statistics: {
        totalUsers,
        totalCompanies,
        recentLogins,
      },
      services: {
        database: 'connected',
        api: 'running',
      },
    };
  }
}