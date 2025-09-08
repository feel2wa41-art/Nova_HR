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
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { InviteUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('company/:companyId')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '회사 사용자 목록 조회' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async getCompanyUsers(
    @Param('companyId') companyId: string,
    @Request() req
  ) {
    return await this.usersService.getCompanyUsers(companyId, req.user.id);
  }

  @Post('company/:companyId/invite')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '사용자 초대' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async inviteUser(
    @Param('companyId') companyId: string,
    @Body() dto: InviteUserDto,
    @Request() req
  ) {
    return await this.usersService.inviteUser(companyId, dto, req.user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: '내 프로필 조회' })
  async getMyProfile(@Request() req) {
    return await this.usersService.getUserById(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: '내 프로필 수정' })
  async updateMyProfile(
    @Body() dto: UpdateUserDto,
    @Request() req
  ) {
    return await this.usersService.updateUser(req.user.id, dto, req.user.id);
  }

  @Put(':userId')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Request() req
  ) {
    return await this.usersService.updateUser(userId, dto, req.user.id);
  }

  @Delete(':userId')
  @Roles('CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '사용자 비활성화' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async deactivateUser(
    @Param('userId') userId: string,
    @Request() req
  ) {
    return await this.usersService.deactivateUser(userId, req.user.id);
  }

  @Post('change-password')
  @ApiOperation({ summary: '비밀번호 변경' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Request() req
  ) {
    return await this.usersService.changePassword(req.user.id, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: '사용자 상세 정보 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async getUserById(@Param('userId') userId: string) {
    return await this.usersService.getUserById(userId);
  }
}
