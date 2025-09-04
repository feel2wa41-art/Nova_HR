import { IsOptional, IsString, IsBoolean, IsArray, IsEnum, IsUUID, IsDateString, IsNumber, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCalendarEventDto {
  @ApiProperty({ description: '일정 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '일정 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '시작 날짜/시간' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: '종료 날짜/시간' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ description: '하루 종일 일정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  all_day?: boolean;

  @ApiPropertyOptional({ 
    description: '일정 유형', 
    enum: ['PERSONAL', 'MEETING', 'COMPANY_ANNOUNCEMENT', 'HOLIDAY', 'BIRTHDAY', 'LEAVE'],
    default: 'PERSONAL' 
  })
  @IsOptional()
  @IsEnum(['PERSONAL', 'MEETING', 'COMPANY_ANNOUNCEMENT', 'HOLIDAY', 'BIRTHDAY', 'LEAVE'])
  event_type?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '색상 (hex)', default: '#1890ff' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '공개 여부 (다른 사람이 볼 수 있는지)', default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: '반복 일정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional({ description: '반복 규칙 (RRULE)' })
  @IsOptional()
  @IsString()
  recurrence_rule?: string;

  @ApiPropertyOptional({ description: '알림 시간 (분 단위)', default: [15] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  reminder_minutes?: number[];

  @ApiPropertyOptional({ 
    description: '일정 상태',
    enum: ['CONFIRMED', 'TENTATIVE', 'CANCELLED'],
    default: 'CONFIRMED'
  })
  @IsOptional()
  @IsEnum(['CONFIRMED', 'TENTATIVE', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: '참석자 사용자 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  attendee_ids?: string[];
}

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({ description: '일정 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '일정 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '시작 날짜/시간' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: '종료 날짜/시간' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: '하루 종일 일정 여부' })
  @IsOptional()
  @IsBoolean()
  all_day?: boolean;

  @ApiPropertyOptional({ description: '일정 유형' })
  @IsOptional()
  @IsEnum(['PERSONAL', 'MEETING', 'COMPANY_ANNOUNCEMENT', 'HOLIDAY', 'BIRTHDAY', 'LEAVE'])
  event_type?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '색상 (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '공개 여부' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: '반복 일정 여부' })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional({ description: '반복 규칙 (RRULE)' })
  @IsOptional()
  @IsString()
  recurrence_rule?: string;

  @ApiPropertyOptional({ description: '알림 시간 (분 단위)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  reminder_minutes?: number[];

  @ApiPropertyOptional({ description: '일정 상태' })
  @IsOptional()
  @IsEnum(['CONFIRMED', 'TENTATIVE', 'CANCELLED'])
  status?: string;
}

export class GetCalendarEventsQueryDto {
  @ApiPropertyOptional({ description: '시작 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: '종료 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: '일정 유형 필터' })
  @IsOptional()
  @IsEnum(['PERSONAL', 'MEETING', 'COMPANY_ANNOUNCEMENT', 'HOLIDAY', 'BIRTHDAY', 'LEAVE'])
  event_type?: string;

  @ApiPropertyOptional({ description: '다른 사용자의 일정 포함 여부', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_others?: boolean;

  @ApiPropertyOptional({ description: '특정 사용자 ID의 일정만 조회' })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}

export class RespondToEventDto {
  @ApiProperty({ 
    description: '참석 응답', 
    enum: ['ACCEPTED', 'DECLINED', 'TENTATIVE'] 
  })
  @IsEnum(['ACCEPTED', 'DECLINED', 'TENTATIVE'])
  status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';

  @ApiPropertyOptional({ description: '응답 메시지' })
  @IsOptional()
  @IsString()
  response_message?: string;
}

export class CreateAnnouncementDto {
  @ApiProperty({ description: '공지사항 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '공지사항 내용' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    description: '공지사항 유형',
    enum: ['GENERAL', 'URGENT', 'POLICY', 'EVENT', 'MAINTENANCE'],
    default: 'GENERAL'
  })
  @IsOptional()
  @IsEnum(['GENERAL', 'URGENT', 'POLICY', 'EVENT', 'MAINTENANCE'])
  announcement_type?: string;

  @ApiPropertyOptional({ 
    description: '우선순위',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: '게시 날짜/시간' })
  @IsOptional()
  @IsDateString()
  publish_date?: string;

  @ApiPropertyOptional({ description: '만료 날짜/시간' })
  @IsOptional()
  @IsDateString()
  expire_date?: string;

  @ApiPropertyOptional({ 
    description: '대상 청중',
    enum: ['ALL', 'DEPARTMENT', 'SPECIFIC_USERS'],
    default: 'ALL'
  })
  @IsOptional()
  @IsEnum(['ALL', 'DEPARTMENT', 'SPECIFIC_USERS'])
  target_audience?: string;

  @ApiPropertyOptional({ description: '대상 부서 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  department_ids?: string[];

  @ApiPropertyOptional({ description: '대상 사용자 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  user_ids?: string[];
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({ description: '공지사항 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '공지사항 내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '공지사항 유형' })
  @IsOptional()
  @IsEnum(['GENERAL', 'URGENT', 'POLICY', 'EVENT', 'MAINTENANCE'])
  announcement_type?: string;

  @ApiPropertyOptional({ description: '우선순위' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: '게시 날짜/시간' })
  @IsOptional()
  @IsDateString()
  publish_date?: string;

  @ApiPropertyOptional({ description: '만료 날짜/시간' })
  @IsOptional()
  @IsDateString()
  expire_date?: string;

  @ApiPropertyOptional({ description: '대상 청중' })
  @IsOptional()
  @IsEnum(['ALL', 'DEPARTMENT', 'SPECIFIC_USERS'])
  target_audience?: string;

  @ApiPropertyOptional({ description: '대상 부서 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  department_ids?: string[];

  @ApiPropertyOptional({ description: '대상 사용자 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  user_ids?: string[];
}

export class GetAnnouncementsQueryDto {
  @ApiPropertyOptional({ description: '공지사항 유형 필터' })
  @IsOptional()
  @IsEnum(['GENERAL', 'URGENT', 'POLICY', 'EVENT', 'MAINTENANCE'])
  announcement_type?: string;

  @ApiPropertyOptional({ description: '우선순위 필터' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: '읽지 않은 것만 보기' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread_only?: boolean;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 개수', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;
}

export class UpdateCalendarSettingsDto {
  @ApiPropertyOptional({ description: '기본 보기', enum: ['MONTH', 'WEEK', 'DAY', 'AGENDA'] })
  @IsOptional()
  @IsEnum(['MONTH', 'WEEK', 'DAY', 'AGENDA'])
  default_view?: string;

  @ApiPropertyOptional({ description: '주 시작일 (0=일요일, 1=월요일)', minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  week_start?: number;

  @ApiPropertyOptional({ description: '근무 시작 시간 (HH:MM)' })
  @IsOptional()
  @IsString()
  work_hours_start?: string;

  @ApiPropertyOptional({ description: '근무 종료 시간 (HH:MM)' })
  @IsOptional()
  @IsString()
  work_hours_end?: string;

  @ApiPropertyOptional({ description: '주말 표시 여부' })
  @IsOptional()
  @IsBoolean()
  show_weekends?: boolean;

  @ApiPropertyOptional({ description: '기본 알림 시간 (분)' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  default_reminder?: number;

  @ApiPropertyOptional({ description: '시간대' })
  @IsOptional()
  @IsString()
  time_zone?: string;

  @ApiPropertyOptional({ description: '거절한 일정 표시 여부' })
  @IsOptional()
  @IsBoolean()
  show_declined_events?: boolean;

  @ApiPropertyOptional({ description: '캘린더 색상 스키마' })
  @IsOptional()
  calendar_color_scheme?: any;
}