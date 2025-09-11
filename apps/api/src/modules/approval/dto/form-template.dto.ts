import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

// 폼 필드 타입
export enum FormFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  FILE = 'file',
  MONEY = 'money',
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',
  TABLE = 'table',
  SECTION = 'section',
  DIVIDER = 'divider'
}

// 필드 검증 규칙
export class FieldValidation {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

// 선택 옵션
export class SelectOption {
  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// 테이블 컬럼 정의
export class TableColumn {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsEnum(FormFieldType)
  type: FormFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validation?: FieldValidation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  options?: SelectOption[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

// 폼 필드 정의
export class FormField {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsEnum(FormFieldType)
  type: FormFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  validation?: FieldValidation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  options?: SelectOption[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  columns?: TableColumn[]; // for table type

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rows?: number; // for textarea

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxFiles?: number; // for file upload

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  acceptedFormats?: string[]; // for file upload

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxFileSize?: number; // in MB

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string; // for money type

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAdd?: boolean; // for table type - 행 추가 가능 여부

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDelete?: boolean; // for table type - 행 삭제 가능 여부

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minRows?: number; // for table type

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxRows?: number; // for table type

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayFormat?: string; // for date/datetime

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  colSpan?: number; // 그리드 레이아웃에서 차지할 컬럼 수 (1-12)

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  calculated?: boolean; // 계산 필드 여부

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formula?: string; // 계산 공식
}

// 폼 섹션
export class FormSection {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsArray()
  fields: FormField[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  collapsible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  defaultCollapsed?: boolean;
}

// 폼 템플릿 스키마
export class FormTemplateSchema {
  @ApiProperty()
  @IsString()
  version: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsArray()
  sections: FormSection[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: {
    submitButtonText?: string;
    cancelButtonText?: string;
    saveAsDraft?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number; // in seconds
    showProgress?: boolean;
    confirmOnLeave?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  layout?: {
    columns?: number; // 1, 2, 3, 4
    spacing?: 'compact' | 'normal' | 'relaxed';
  };
}

// 폼 템플릿 생성 DTO
export class CreateFormTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty()
  @IsObject()
  formSchema: FormTemplateSchema;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// 폼 템플릿 수정 DTO
export class UpdateFormTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  formSchema?: FormTemplateSchema;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// 폼 제출 데이터 DTO
export class SubmitFormDataDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsObject()
  formData: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: string[];
}