import { IsOptional, IsString, IsBoolean, IsArray, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCommunityPostDto {
  @ApiProperty({ description: '제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '내용' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    description: '게시글 유형',
    enum: ['GENERAL', 'ANNOUNCEMENT', 'POLICY', 'URGENT', 'CELEBRATION', 'QUESTION'],
    default: 'GENERAL'
  })
  @IsOptional()
  @IsEnum(['GENERAL', 'ANNOUNCEMENT', 'POLICY', 'URGENT', 'CELEBRATION', 'QUESTION'])
  post_type?: string;

  @ApiPropertyOptional({ 
    description: '우선순위',
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: '상단 고정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @ApiPropertyOptional({ description: '댓글 허용 여부', default: true })
  @IsOptional()
  @IsBoolean()
  allow_comments?: boolean;

  @ApiPropertyOptional({ 
    description: '대상 청중',
    enum: ['ALL', 'DEPARTMENT', 'ROLE', 'SPECIFIC_USERS'],
    default: 'ALL'
  })
  @IsOptional()
  @IsEnum(['ALL', 'DEPARTMENT', 'ROLE', 'SPECIFIC_USERS'])
  target_audience?: string;

  @ApiPropertyOptional({ description: '대상 부서 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  department_ids?: string[];

  @ApiPropertyOptional({ description: '대상 역할 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  role_ids?: string[];

  @ApiPropertyOptional({ description: '대상 사용자 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  user_ids?: string[];

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '알림 설정' })
  @IsOptional()
  notification_settings?: {
    web_push?: boolean;
    email?: boolean;
    app_push?: boolean;
  };
}

export class UpdateCommunityPostDto {
  @ApiPropertyOptional({ description: '제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '내용' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '게시글 유형' })
  @IsOptional()
  @IsEnum(['GENERAL', 'ANNOUNCEMENT', 'POLICY', 'URGENT', 'CELEBRATION', 'QUESTION'])
  post_type?: string;

  @ApiPropertyOptional({ description: '우선순위' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: '상단 고정 여부' })
  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @ApiPropertyOptional({ description: '댓글 허용 여부' })
  @IsOptional()
  @IsBoolean()
  allow_comments?: boolean;

  @ApiPropertyOptional({ description: '대상 청중' })
  @IsOptional()
  @IsEnum(['ALL', 'DEPARTMENT', 'ROLE', 'SPECIFIC_USERS'])
  target_audience?: string;

  @ApiPropertyOptional({ description: '대상 부서 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  department_ids?: string[];

  @ApiPropertyOptional({ description: '대상 역할 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  role_ids?: string[];

  @ApiPropertyOptional({ description: '대상 사용자 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  user_ids?: string[];

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '부모 댓글 ID (대댓글인 경우)' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  content: string;
}

export class GetCommunityPostsQueryDto {
  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '게시글 유형 필터' })
  @IsOptional()
  @IsEnum(['GENERAL', 'ANNOUNCEMENT', 'POLICY', 'URGENT', 'CELEBRATION', 'QUESTION'])
  post_type?: string;

  @ApiPropertyOptional({ description: '우선순위 필터' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: '태그 필터' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '작성자 ID' })
  @IsOptional()
  @IsUUID()
  author_id?: string;

  @ApiPropertyOptional({ description: '정렬 기준', enum: ['created_at', 'updated_at', 'view_count', 'like_count'] })
  @IsOptional()
  @IsEnum(['created_at', 'updated_at', 'view_count', 'like_count'])
  sort_by?: string;

  @ApiPropertyOptional({ description: '정렬 순서', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';

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

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: '웹 푸쉬 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  web_push_enabled?: boolean;

  @ApiPropertyOptional({ description: '이메일 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @ApiPropertyOptional({ description: '앱 푸쉬 알림 활성화' })
  @IsOptional()
  @IsBoolean()
  app_push_enabled?: boolean;

  @ApiPropertyOptional({ description: '커뮤니티 게시글 알림' })
  @IsOptional()
  @IsBoolean()
  community_posts?: boolean;

  @ApiPropertyOptional({ description: '공지사항 알림' })
  @IsOptional()
  @IsBoolean()
  announcements?: boolean;

  @ApiPropertyOptional({ description: '댓글 알림' })
  @IsOptional()
  @IsBoolean()
  comments?: boolean;

  @ApiPropertyOptional({ description: '좋아요 알림' })
  @IsOptional()
  @IsBoolean()
  likes?: boolean;

  @ApiPropertyOptional({ description: '멘션 알림' })
  @IsOptional()
  @IsBoolean()
  mentions?: boolean;

  @ApiPropertyOptional({ description: '긴급한 알림만 받기' })
  @IsOptional()
  @IsBoolean()
  urgent_only?: boolean;

  @ApiPropertyOptional({ description: '방해 금지 시간 활성화' })
  @IsOptional()
  @IsBoolean()
  quiet_hours_enabled?: boolean;

  @ApiPropertyOptional({ description: '방해 금지 시작 시간 (HH:MM)' })
  @IsOptional()
  @IsString()
  quiet_hours_start?: string;

  @ApiPropertyOptional({ description: '방해 금지 종료 시간 (HH:MM)' })
  @IsOptional()
  @IsString()
  quiet_hours_end?: string;
}

export class WebPushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint' })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'Push subscription keys' })
  keys: {
    p256dh: string;
    auth: string;
  };

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}