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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  GetCalendarEventsQueryDto,
  RespondToEventDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  GetAnnouncementsQueryDto,
  UpdateCalendarSettingsDto,
} from './dto/calendar.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ================================
  // CALENDAR EVENTS
  // ================================

  @Post('events')
  @ApiOperation({ summary: '일정 생성' })
  @ApiResponse({ status: 201, description: '일정 생성 성공' })
  async createEvent(@Request() req: any, @Body() dto: CreateCalendarEventDto) {
    const companyId = req.user.company_id;
    const creatorId = req.user.id;
    return this.calendarService.createEvent(companyId, creatorId, dto);
  }

  @Get('events')
  @ApiOperation({ summary: '일정 목록 조회' })
  @ApiResponse({ status: 200, description: '일정 목록 조회 성공' })
  async getEvents(@Request() req: any, @Query() query: GetCalendarEventsQueryDto) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.calendarService.getEvents(companyId, userId, query);
  }

  @Get('events/today')
  @ApiOperation({ summary: '오늘의 일정 조회' })
  @ApiResponse({ status: 200, description: '오늘의 일정 조회 성공' })
  async getTodaysEvents(@Request() req: any) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.calendarService.getTodaysEvents(companyId, userId);
  }

  @Get('events/upcoming')
  @ApiOperation({ summary: '다가오는 일정 조회' })
  @ApiResponse({ status: 200, description: '다가오는 일정 조회 성공' })
  async getUpcomingEvents(@Request() req: any, @Query('days') days?: number) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.calendarService.getUpcomingEvents(companyId, userId, days);
  }

  @Get('events/:id')
  @ApiOperation({ summary: '일정 상세 조회' })
  @ApiResponse({ status: 200, description: '일정 상세 조회 성공' })
  async getEvent(@Param('id') id: string) {
    return this.calendarService.findEventById(id);
  }

  @Put('events/:id')
  @ApiOperation({ summary: '일정 수정' })
  @ApiResponse({ status: 200, description: '일정 수정 성공' })
  async updateEvent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    const userId = req.user.id;
    return this.calendarService.updateEvent(id, userId, dto);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: '일정 삭제' })
  @ApiResponse({ status: 200, description: '일정 삭제 성공' })
  async deleteEvent(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.calendarService.deleteEvent(id, userId);
  }

  @Post('events/:id/respond')
  @ApiOperation({ summary: '일정 참석 응답' })
  @ApiResponse({ status: 200, description: '응답 저장 성공' })
  async respondToEvent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RespondToEventDto,
  ) {
    const userId = req.user.id;
    return this.calendarService.respondToEvent(id, userId, dto);
  }

  // ================================
  // PUBLIC HOLIDAYS
  // ================================

  @Get('holidays')
  @ApiOperation({ summary: '공휴일 조회' })
  @ApiResponse({ status: 200, description: '공휴일 조회 성공' })
  async getPublicHolidays(
    @Query('country') country?: string,
    @Query('year') year?: number,
  ) {
    return this.calendarService.getPublicHolidays(country, year);
  }

  @Post('holidays/sync')
  @ApiOperation({ summary: '공휴일 동기화' })
  @ApiResponse({ status: 200, description: '공휴일 동기화 성공' })
  async syncPublicHolidays(
    @Query('country') country?: string,
    @Query('year') year?: number,
  ) {
    const currentYear = year || new Date().getFullYear();
    return this.calendarService.syncPublicHolidays(country, currentYear);
  }

  // ================================
  // COMPANY ANNOUNCEMENTS
  // ================================

  @Post('announcements')
  @ApiOperation({ summary: '회사 공지사항 작성' })
  @ApiResponse({ status: 201, description: '공지사항 작성 성공' })
  async createAnnouncement(@Request() req: any, @Body() dto: CreateAnnouncementDto) {
    const companyId = req.user.company_id;
    const authorId = req.user.id;
    return this.calendarService.createAnnouncement(companyId, authorId, dto);
  }

  @Get('announcements')
  @ApiOperation({ summary: '회사 공지사항 목록 조회' })
  @ApiResponse({ status: 200, description: '공지사항 목록 조회 성공' })
  async getAnnouncements(@Request() req: any, @Query() query: GetAnnouncementsQueryDto) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    return this.calendarService.getAnnouncements(companyId, userId, query);
  }

  @Post('announcements/:id/read')
  @ApiOperation({ summary: '공지사항 읽음 처리' })
  @ApiResponse({ status: 200, description: '읽음 처리 성공' })
  async markAnnouncementAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.calendarService.markAnnouncementAsRead(id, userId);
  }

  // ================================
  // CALENDAR SETTINGS
  // ================================

  @Get('settings')
  @ApiOperation({ summary: '캘린더 설정 조회' })
  @ApiResponse({ status: 200, description: '캘린더 설정 조회 성공' })
  async getCalendarSettings(@Request() req: any) {
    const userId = req.user.id;
    return this.calendarService.getCalendarSettings(userId);
  }

  @Put('settings')
  @ApiOperation({ summary: '캘린더 설정 수정' })
  @ApiResponse({ status: 200, description: '캘린더 설정 수정 성공' })
  async updateCalendarSettings(
    @Request() req: any,
    @Body() dto: UpdateCalendarSettingsDto,
  ) {
    const userId = req.user.id;
    return this.calendarService.updateCalendarSettings(userId, dto);
  }
}