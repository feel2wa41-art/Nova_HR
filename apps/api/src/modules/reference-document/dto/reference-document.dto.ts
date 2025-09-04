import { IsOptional, IsString, IsBoolean, IsArray, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferenceDocumentDto {
  @ApiProperty({ description: '제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '내용 (JSON 형태)' })
  content: any;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '공개 여부', default: true })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: '템플릿 여부', default: false })
  @IsOptional()
  @IsBoolean()
  is_template?: boolean;

  @ApiPropertyOptional({ description: '첨부파일 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateReferenceDocumentDto {
  @ApiPropertyOptional({ description: '제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '내용 (JSON 형태)' })
  @IsOptional()
  content?: any;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ description: '태그 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '공개 여부' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({ description: '템플릿 여부' })
  @IsOptional()
  @IsBoolean()
  is_template?: boolean;
}

export class GetReferenceDocumentsQueryDto {
  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ description: '태그' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '작성자 ID' })
  @IsOptional()
  @IsUUID()
  author_id?: string;

  @ApiPropertyOptional({ description: '템플릿만 보기' })
  @IsOptional()
  @IsBoolean()
  templates_only?: boolean;

  @ApiPropertyOptional({ description: '정렬 기준', enum: ['created_at', 'updated_at', 'title', 'view_count'] })
  @IsOptional()
  @IsEnum(['created_at', 'updated_at', 'title', 'view_count'])
  sort_by?: string;

  @ApiPropertyOptional({ description: '정렬 순서', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 개수', default: 20 })
  @IsOptional()
  limit?: number;
}

export class UploadAttachmentDto {
  @ApiProperty({ description: '파일명' })
  @IsString()
  file_name: string;

  @ApiProperty({ description: '파일 크기 (바이트)' })
  file_size: number;

  @ApiProperty({ description: 'MIME 타입' })
  @IsString()
  mime_type: string;
}