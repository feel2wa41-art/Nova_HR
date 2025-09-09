import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Query,
  Request 
} from '@nestjs/common';
import { FeatureConfigService } from './feature-config.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { 
  UpdateFeatureConfigDto, 
  UpdateMenuPermissionsDto, 
  UpdateFeatureLimitsDto 
} from './dto/feature-config.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Feature Config')
@ApiBearerAuth()
@Controller('feature-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureConfigController {
  constructor(private readonly featureConfigService: FeatureConfigService) {}

  @Get('company/:companyId')
  @Roles('ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Get company feature configuration' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async getFeatureConfig(@Param('companyId') companyId: string) {
    return await this.featureConfigService.getFeatureConfig(companyId);
  }

  @Put('company/:companyId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update company feature configuration' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async updateFeatureConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateFeatureConfigDto
  ) {
    return await this.featureConfigService.updateFeatureConfig(companyId, dto);
  }

  @Get('company/:companyId/menu-permissions')
  @Roles('ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Get menu permissions for company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  async getMenuPermissions(
    @Param('companyId') companyId: string,
    @Query('role') role?: string
  ) {
    return await this.featureConfigService.getMenuPermissions(companyId, role);
  }

  @Put('company/:companyId/menu-permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update menu permissions for company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async updateMenuPermissions(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateMenuPermissionsDto
  ) {
    return await this.featureConfigService.updateMenuPermissions(companyId, dto);
  }

  @Get('company/:companyId/feature-limits')
  @Roles('ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: 'Get feature limits for company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async getFeatureLimits(@Param('companyId') companyId: string) {
    return await this.featureConfigService.getFeatureLimits(companyId);
  }

  @Put('company/:companyId/feature-limits')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update feature limits for company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  async updateFeatureLimits(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateFeatureLimitsDto
  ) {
    return await this.featureConfigService.updateFeatureLimits(companyId, dto);
  }

  @Get('company/:companyId/check-limit/:featureKey')
  @ApiOperation({ summary: 'Check if feature limit is reached' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'featureKey', description: 'Feature key to check' })
  async checkFeatureLimit(
    @Param('companyId') companyId: string,
    @Param('featureKey') featureKey: string
  ) {
    const allowed = await this.featureConfigService.checkFeatureLimit(companyId, featureKey);
    return { allowed };
  }

  @Post('company/:companyId/increment-usage/:featureKey')
  @ApiOperation({ summary: 'Increment feature usage' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'featureKey', description: 'Feature key to increment' })
  async incrementFeatureUsage(
    @Param('companyId') companyId: string,
    @Param('featureKey') featureKey: string
  ) {
    await this.featureConfigService.incrementFeatureUsage(companyId, featureKey);
    return { success: true };
  }

  @Get('check-permission')
  @ApiOperation({ summary: 'Check menu permission for current user' })
  @ApiQuery({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'menuKey', description: 'Menu key' })
  @ApiQuery({ name: 'action', description: 'Action to check', enum: ['view', 'create', 'edit', 'delete', 'approve', 'export'] })
  async checkMenuPermission(
    @Request() req,
    @Query('companyId') companyId: string,
    @Query('menuKey') menuKey: string,
    @Query('action') action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  ) {
    const allowed = await this.featureConfigService.checkMenuPermission(
      companyId,
      req.user.id,
      menuKey,
      action
    );
    return { allowed };
  }
}
