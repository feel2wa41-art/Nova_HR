import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { BusinessTripSettingService } from './business-trip-setting.service';
import { CreateBusinessTripSettingDto, UpdateBusinessTripSettingDto, UserGrade } from './business-trip-setting.dto';

@ApiTags('Business Trip Settings')
@Controller('api/v1/business-trip-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BusinessTripSettingController {
  constructor(private readonly businessTripSettingService: BusinessTripSettingService) {}

  @Post()
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Create business trip setting' })
  @ApiResponse({ status: 201, description: 'Business trip setting created successfully' })
  async createBusinessTripSetting(
    @Body() dto: CreateBusinessTripSettingDto,
    @Request() req
  ) {
    return await this.businessTripSettingService.createBusinessTripSetting(
      dto,
      req.user.companyId
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get business trip settings' })
  @ApiResponse({ status: 200, description: 'Business trip settings retrieved successfully' })
  async getBusinessTripSettings(@Request() req) {
    return await this.businessTripSettingService.getBusinessTripSettings(
      req.user.companyId
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business trip setting by ID' })
  @ApiResponse({ status: 200, description: 'Business trip setting retrieved successfully' })
  async getBusinessTripSetting(
    @Param('id') id: string,
    @Request() req
  ) {
    return await this.businessTripSettingService.getBusinessTripSetting(
      id,
      req.user.companyId
    );
  }

  @Put(':id')
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Update business trip setting' })
  @ApiResponse({ status: 200, description: 'Business trip setting updated successfully' })
  async updateBusinessTripSetting(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessTripSettingDto,
    @Request() req
  ) {
    return await this.businessTripSettingService.updateBusinessTripSetting(
      id,
      dto,
      req.user.companyId
    );
  }

  @Delete(':id')
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Delete business trip setting' })
  @ApiResponse({ status: 200, description: 'Business trip setting deleted successfully' })
  async deleteBusinessTripSetting(
    @Param('id') id: string,
    @Request() req
  ) {
    return await this.businessTripSettingService.deleteBusinessTripSetting(
      id,
      req.user.companyId
    );
  }

  @Get('user/:userId/limits')
  @ApiOperation({ summary: 'Get expense limits for a user' })
  @ApiResponse({ status: 200, description: 'User expense limits retrieved successfully' })
  async getUserExpenseLimits(
    @Param('userId') userId: string,
    @Query('currencyCode') currencyCode: string,
    @Query('userGrade') userGrade: UserGrade,
    @Request() req
  ) {
    return await this.businessTripSettingService.getExpenseLimitsForUser(
      req.user.companyId,
      userGrade || UserGrade.STAFF,
      currencyCode
    );
  }

  @Post('validate-expense')
  @ApiOperation({ summary: 'Validate expense against limits' })
  @ApiResponse({ status: 200, description: 'Expense validation result' })
  async validateExpense(
    @Body() body: {
      userGrade: UserGrade;
      expenseType: 'accommodation' | 'meal' | 'transportation' | 'miscellaneous';
      amount: number;
      currencyCode?: string;
    },
    @Request() req
  ) {
    return await this.businessTripSettingService.validateExpense(
      req.user.companyId,
      body.userGrade,
      body.expenseType,
      body.amount,
      body.currencyCode
    );
  }

  @Post('init-defaults')
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Initialize default business trip settings' })
  @ApiResponse({ status: 201, description: 'Default settings created' })
  async initDefaults(@Request() req) {
    const result = await this.businessTripSettingService.createDefaultBusinessTripSettings(
      req.user.companyId
    );
    return { 
      message: 'Default business trip settings initialized successfully',
      data: result
    };
  }
}