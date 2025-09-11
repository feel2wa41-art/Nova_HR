import { 
  Controller, 
  Get, 
  Post,
  Put,
  Patch, 
  Delete, 
  Param, 
  Body, 
  UseGuards, 
  Request,
  Query 
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all users for current tenant' })
  async getAllUsers(@Request() req: any) {
    // Use tenantId from JWT token for security
    const tenantId = req.user.tenantId;
    return this.usersService.findAll(tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (alias for /me)' })
  async getUserProfile(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('company/:companyId')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get users by company ID' })
  async getUsersByCompany(@Param('companyId') companyId: string, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.usersService.findByCompany(companyId, tenantId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats(@Request() req: any) {
    // Use tenantId from JWT token for security
    const tenantId = req.user.tenantId;
    return this.usersService.getUserStats(tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateCurrentUser(
    @Request() req: any,
    @Body() updateData: {
      name?: string;
      title?: string;
      phone?: string;
      avatar_url?: string;
    }
  ) {
    return this.usersService.updateUser(req.user.userId, updateData);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @Request() req: any,
    @Body() body: { newPassword: string }
  ) {
    return this.usersService.updatePassword(req.user.userId, body.newPassword);
  }

  @Put('me/language')
  @ApiOperation({ summary: 'Update current user language preference' })
  async updateLanguage(
    @Request() req: any,
    @Body() body: { language: string }
  ) {
    return this.usersService.updateUser(req.user.userId, { language: body.language });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      title?: string;
      phone?: string;
      avatar_url?: string;
      status?: string;
      role?: string;
      org_id?: string;
    }
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string }
  ) {
    return this.usersService.updatePassword(id, body.newPassword);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  async createUser(
    @Request() req: any,
    @Body() body: {
      email: string;
      password: string;
      name: string;
      title?: string;
      phone?: string;
      role: string;
      org_id?: string;
    }
  ) {
    return this.usersService.createUser({
      ...body,
      tenant_id: req.user.tenantId,
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}