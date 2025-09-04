import { IsOptional, IsString, IsBoolean, IsDateString, IsEnum, IsNumber, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ description: '사용자 상태' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'BUSY', 'AWAY'])
  status?: string;

  @ApiPropertyOptional({ description: '위치' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '기분/상태' })
  @IsOptional()
  @IsString()
  mood?: string;

  @ApiPropertyOptional({ description: '상태 메시지' })
  @IsOptional()
  @IsString()
  status_message?: string;

  @ApiPropertyOptional({ description: '생일' })
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiPropertyOptional({ description: '내선번호' })
  @IsOptional()
  @IsString()
  phone_extension?: string;
}

export class CreateEventDto {
  @ApiProperty({ description: '이벤트 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '이벤트 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '시작 날짜' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: '하루종일 여부', default: false })
  @IsOptional()
  @IsBoolean()
  all_day?: boolean;

  @ApiPropertyOptional({ description: '이벤트 타입', enum: ['MEETING', 'TRAINING', 'HOLIDAY', 'BIRTHDAY', 'COMPANY_EVENT', 'GENERAL'] })
  @IsOptional()
  @IsEnum(['MEETING', 'TRAINING', 'HOLIDAY', 'BIRTHDAY', 'COMPANY_EVENT', 'GENERAL'])
  event_type?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '최대 참가자 수' })
  @IsOptional()
  @IsNumber()
  max_participants?: number;

  @ApiPropertyOptional({ description: '공개 여부', default: true })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: '참가자 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  participant_ids?: string[];
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: '이벤트 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '이벤트 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '시작 날짜' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: '종료 날짜' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: '하루종일 여부' })
  @IsOptional()
  @IsBoolean()
  all_day?: boolean;

  @ApiPropertyOptional({ description: '이벤트 타입' })
  @IsOptional()
  @IsEnum(['MEETING', 'TRAINING', 'HOLIDAY', 'BIRTHDAY', 'COMPANY_EVENT', 'GENERAL'])
  event_type?: string;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '최대 참가자 수' })
  @IsOptional()
  @IsNumber()
  max_participants?: number;

  @ApiPropertyOptional({ description: '공개 여부' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}

export class ParticipateEventDto {
  @ApiProperty({ description: '참가 상태', enum: ['ACCEPTED', 'DECLINED'] })
  @IsEnum(['ACCEPTED', 'DECLINED'])
  status: 'ACCEPTED' | 'DECLINED';

  @ApiPropertyOptional({ description: '참가 메모' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetUsersQueryDto {
  @ApiPropertyOptional({ description: '조직 단위 ID' })
  @IsOptional()
  @IsString()
  orgUnitId?: string;

  @ApiPropertyOptional({ description: '상태 필터' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class GetEventsQueryDto {
  @ApiPropertyOptional({ description: '시작 날짜 필터' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: '종료 날짜 필터' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: '이벤트 타입 필터' })
  @IsOptional()
  @IsEnum(['MEETING', 'TRAINING', 'HOLIDAY', 'BIRTHDAY', 'COMPANY_EVENT', 'GENERAL'])
  event_type?: string;

  @ApiPropertyOptional({ description: '상태 필터' })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'CANCELLED'])
  status?: string;
}