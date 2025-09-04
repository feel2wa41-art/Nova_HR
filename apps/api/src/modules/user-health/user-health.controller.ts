import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserHealthService } from './user-health.service';
import {
  UpdateUserStatusDto,
  CreateEventDto,
  UpdateEventDto,
  ParticipateEventDto,
  GetUsersQueryDto,
  GetEventsQueryDto,
} from './dto/user-health.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('user-health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-health')
export class UserHealthController {
  constructor(private readonly userHealthService: UserHealthService) {}

  @Get('organization-chart')
  @ApiOperation({ summary: '조직도 조회' })
  @ApiResponse({ status: 200, description: '조직도 조회 성공' })
  async getOrganizationChart(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.userHealthService.getOrganizationChart(companyId);
  }

  @Get('users')
  @ApiOperation({ summary: '사용자 상태 목록 조회' })
  @ApiResponse({ status: 200, description: '사용자 목록 조회 성공' })
  async getUsersWithStatus(
    @Request() req: any,
    @Query() query: GetUsersQueryDto,
  ) {
    const companyId = req.user.company_id;
    return this.userHealthService.getUsersWithStatus(companyId, {
      orgUnitId: query.orgUnitId,
      status: query.status,
      search: query.search,
    });
  }

  @Put('status')
  @ApiOperation({ summary: '사용자 상태 업데이트' })
  @ApiResponse({ status: 200, description: '상태 업데이트 성공' })
  async updateUserStatus(
    @Request() req: any,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const userId = req.user.id;
    return this.userHealthService.updateUserStatus(userId, dto);
  }

  @Post('last-seen')
  @ApiOperation({ summary: '마지막 접속 시간 업데이트' })
  @ApiResponse({ status: 200, description: '마지막 접속 시간 업데이트 성공' })
  async updateLastSeen(@Request() req: any) {
    const userId = req.user.id;
    return this.userHealthService.updateLastSeen(userId);
  }

  @Get('birthdays/today')
  @ApiOperation({ summary: '오늘 생일인 사용자 조회' })
  @ApiResponse({ status: 200, description: '오늘 생일 사용자 조회 성공' })
  async getTodaysBirthdays(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.userHealthService.getTodaysBirthdays(companyId);
  }

  @Get('birthdays/upcoming')
  @ApiOperation({ summary: '다가오는 생일 사용자 조회' })
  @ApiResponse({ status: 200, description: '다가오는 생일 사용자 조회 성공' })
  async getUpcomingBirthdays(
    @Request() req: any,
    @Query('days') days?: number,
  ) {
    const companyId = req.user.company_id;
    return this.userHealthService.getUpcomingBirthdays(companyId, days || 7);
  }

  @Post('events')
  @ApiOperation({ summary: '이벤트 생성' })
  @ApiResponse({ status: 201, description: '이벤트 생성 성공' })
  async createEvent(@Request() req: any, @Body() dto: CreateEventDto) {
    const companyId = req.user.company_id;
    const organizerId = req.user.id;
    return this.userHealthService.createEvent(companyId, organizerId, dto);
  }

  @Get('events')
  @ApiOperation({ summary: '이벤트 목록 조회' })
  @ApiResponse({ status: 200, description: '이벤트 목록 조회 성공' })
  async getEvents(@Request() req: any, @Query() query: GetEventsQueryDto) {
    const companyId = req.user.company_id;
    return this.userHealthService.getEvents(companyId, {
      start_date: query.start_date,
      end_date: query.end_date,
      event_type: query.event_type,
      status: query.status,
    });
  }

  @Put('events/:eventId/participate')
  @ApiOperation({ summary: '이벤트 참가 응답' })
  @ApiResponse({ status: 200, description: '이벤트 참가 응답 성공' })
  async participateInEvent(
    @Request() req: any,
    @Param('eventId') eventId: string,
    @Body() dto: ParticipateEventDto,
  ) {
    const userId = req.user.id;
    return this.userHealthService.participateInEvent(
      eventId,
      userId,
      dto.status,
      dto.notes,
    );
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: '대시보드 요약 정보 조회' })
  @ApiResponse({ status: 200, description: '대시보드 요약 정보 조회 성공' })
  async getDashboardSummary(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.userHealthService.getDashboardSummary(companyId);
  }
}