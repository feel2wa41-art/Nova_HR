import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateFormTemplateDto, UpdateFormTemplateDto, FormTemplateSchema } from './dto/form-template.dto';

@Injectable()
export class FormTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  // 폼 템플릿 생성
  async createFormTemplate(dto: CreateFormTemplateDto, companyId: string) {
    // 코드 중복 체크
    if (dto.code) {
      const existing = await this.prisma.approval_category.findFirst({
        where: {
          code: dto.code,
          company_id: companyId
        }
      });

      if (existing) {
        throw new BadRequestException(`Template with code ${dto.code} already exists`);
      }
    }

    // 자동 코드 생성
    const code = dto.code || this.generateTemplateCode(dto.name);

    return await this.prisma.approval_category.create({
      data: {
        company_id: companyId,
        name: dto.name,
        code: code,
        description: dto.description,
        icon: dto.icon,
        form_schema: dto.formSchema as any,
        template_content: dto.templateContent,
        is_active: dto.isActive ?? true
      }
    });
  }

  // 폼 템플릿 목록 조회
  async getFormTemplates(companyId: string, includeSystemTemplates = true) {
    const where: any = {
      OR: [
        { company_id: companyId }
      ],
      is_active: true
    };

    // 시스템 템플릿도 포함
    if (includeSystemTemplates) {
      where.OR.push({ company_id: null });
    }

    return await this.prisma.approval_category.findMany({
      where,
      orderBy: [
        { order_index: 'asc' },
        { created_at: 'desc' }
      ]
    });
  }

  // 폼 템플릿 상세 조회
  async getFormTemplate(id: string, companyId: string) {
    const template = await this.prisma.approval_category.findFirst({
      where: {
        id,
        OR: [
          { company_id: companyId },
          { company_id: null } // 시스템 템플릿
        ]
      }
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    return template;
  }

  // 폼 템플릿 수정
  async updateFormTemplate(id: string, dto: UpdateFormTemplateDto, companyId: string) {
    // 수정 권한 체크
    const template = await this.prisma.approval_category.findFirst({
      where: {
        id,
        company_id: companyId // 자사 템플릿만 수정 가능
      }
    });

    if (!template) {
      throw new NotFoundException('Form template not found or no permission to edit');
    }

    return await this.prisma.approval_category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        form_schema: dto.formSchema as any,
        template_content: dto.templateContent,
        is_active: dto.isActive
      }
    });
  }

  // 폼 템플릿 삭제 (비활성화)
  async deleteFormTemplate(id: string, companyId: string) {
    const template = await this.prisma.approval_category.findFirst({
      where: {
        id,
        company_id: companyId
      }
    });

    if (!template) {
      throw new NotFoundException('Form template not found or no permission to delete');
    }

    // 사용 중인 템플릿인지 체크
    const inUse = await this.prisma.approval_draft.findFirst({
      where: {
        category_id: id,
        status: {
          notIn: ['CANCELLED', 'REJECTED']
        }
      }
    });

    if (inUse) {
      throw new BadRequestException('Cannot delete template that is in use');
    }

    return await this.prisma.approval_category.update({
      where: { id },
      data: { is_active: false }
    });
  }

  // 폼 템플릿 복제
  async cloneFormTemplate(id: string, companyId: string, newName: string) {
    const original = await this.getFormTemplate(id, companyId);
    
    const code = this.generateTemplateCode(newName);

    return await this.prisma.approval_category.create({
      data: {
        company_id: companyId,
        name: newName,
        code: code,
        description: original.description ? `${original.description} (복사본)` : null,
        icon: original.icon,
        form_schema: original.form_schema,
        template_content: original.template_content,
        is_active: true
      }
    });
  }

  // 기본 템플릿 생성 (시스템 초기화용)
  async createDefaultTemplates() {
    const templates = [
      {
        name: '사무용품 구매 신청',
        code: 'OFFICE_SUPPLIES',
        description: '사무용품 구매를 위한 신청서',
        icon: '📦',
        form_schema: this.getOfficeSuppliesSchema()
      },
      {
        name: '경비 정산 신청',
        code: 'EXPENSE_CLAIM',
        description: '업무 관련 경비 정산 신청서',
        icon: '💰',
        form_schema: this.getExpenseClaimSchema()
      },
      {
        name: '출장 계획 신청',
        code: 'BUSINESS_TRIP_PLAN',
        description: '출장 계획 및 예산 승인 신청서',
        icon: '📋',
        form_schema: this.getBusinessTripPlanSchema()
      },
      {
        name: '출장 비용 정산',
        code: 'BUSINESS_TRIP_EXPENSE',
        description: '출장 비용 정산 및 영수증 제출',
        icon: '💰',
        form_schema: this.getBusinessTripExpenseSchema()
      },
      {
        name: '출장 보고서',
        code: 'BUSINESS_TRIP_REPORT',
        description: '출장 완료 후 업무 성과 보고서',
        icon: '📄',
        form_schema: this.getBusinessTripReportSchema()
      },
      {
        name: '재택근무 신청',
        code: 'REMOTE_WORK',
        description: '재택근무 신청서',
        icon: '🏠',
        form_schema: this.getRemoteWorkSchema()
      }
    ];

    for (const template of templates) {
      const existing = await this.prisma.approval_category.findFirst({
        where: {
          code: template.code,
          company_id: null
        }
      });

      if (!existing) {
        await this.prisma.approval_category.create({
          data: {
            ...template,
            company_id: null, // 시스템 템플릿
            is_active: true,
            form_schema: template.form_schema as any
          }
        });
      }
    }
  }

  // 사무용품 구매 신청 스키마
  private getOfficeSuppliesSchema(): FormTemplateSchema {
    return {
      version: '1.0',
      title: '사무용품 구매 신청',
      description: '사무용품 구매를 위한 신청서입니다.',
      sections: [
        {
          title: '신청 정보',
          fields: [
            {
              key: 'request_date',
              label: '신청일',
              type: 'date' as any,
              validation: { required: true },
              defaultValue: new Date().toISOString().split('T')[0],
              colSpan: 6
            },
            {
              key: 'department',
              label: '부서',
              type: 'text' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'purpose',
              label: '구매 목적',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 3,
              colSpan: 12
            }
          ]
        },
        {
          title: '구매 품목',
          fields: [
            {
              key: 'items',
              label: '품목 리스트',
              type: 'table' as any,
              validation: { required: true },
              allowAdd: true,
              allowDelete: true,
              minRows: 1,
              maxRows: 20,
              columns: [
                {
                  key: 'item_name',
                  label: '품목명',
                  type: 'text' as any,
                  validation: { required: true }
                },
                {
                  key: 'quantity',
                  label: '수량',
                  type: 'number' as any,
                  validation: { required: true, min: 1 }
                },
                {
                  key: 'unit_price',
                  label: '단가',
                  type: 'money' as any,
                  validation: { required: true, min: 0 }
                },
                {
                  key: 'total_price',
                  label: '금액',
                  type: 'money' as any,
                  validation: { required: true }
                },
                {
                  key: 'note',
                  label: '비고',
                  type: 'text' as any
                }
              ]
            }
          ]
        },
        {
          title: '결제 정보',
          fields: [
            {
              key: 'total_amount',
              label: '총 금액',
              type: 'money' as any,
              validation: { required: true },
              currency: 'KRW',
              colSpan: 6
            },
            {
              key: 'payment_method',
              label: '결제 방법',
              type: 'select' as any,
              validation: { required: true },
              options: [
                { value: 'corporate_card', label: '법인카드' },
                { value: 'cash', label: '현금' },
                { value: 'transfer', label: '계좌이체' }
              ],
              colSpan: 6
            },
            {
              key: 'receipt',
              label: '영수증',
              type: 'file' as any,
              maxFiles: 5,
              maxFileSize: 10,
              acceptedFormats: ['pdf', 'jpg', 'png', 'jpeg'],
              helpText: '영수증 또는 견적서를 첨부해주세요 (최대 5개)',
              colSpan: 12
            }
          ]
        }
      ],
      settings: {
        submitButtonText: '신청하기',
        cancelButtonText: '취소',
        saveAsDraft: true,
        autoSave: true,
        autoSaveInterval: 30
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    };
  }

  // 경비 정산 스키마
  private getExpenseClaimSchema(): FormTemplateSchema {
    return {
      version: '1.0',
      title: '경비 정산 신청',
      sections: [
        {
          title: '정산 기간',
          fields: [
            {
              key: 'period_start',
              label: '시작일',
              type: 'date' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'period_end',
              label: '종료일',
              type: 'date' as any,
              validation: { required: true },
              colSpan: 6
            }
          ]
        },
        {
          title: '경비 내역',
          fields: [
            {
              key: 'expenses',
              label: '경비 항목',
              type: 'table' as any,
              validation: { required: true },
              allowAdd: true,
              allowDelete: true,
              minRows: 1,
              columns: [
                {
                  key: 'date',
                  label: '사용일',
                  type: 'date' as any,
                  validation: { required: true }
                },
                {
                  key: 'category',
                  label: '비용 항목',
                  type: 'select' as any,
                  validation: { required: true },
                  options: [
                    { value: 'transport', label: '교통비' },
                    { value: 'meal', label: '식비' },
                    { value: 'accommodation', label: '숙박비' },
                    { value: 'entertainment', label: '접대비' },
                    { value: 'other', label: '기타' }
                  ]
                },
                {
                  key: 'description',
                  label: '내용',
                  type: 'text' as any,
                  validation: { required: true }
                },
                {
                  key: 'amount',
                  label: '금액',
                  type: 'money' as any,
                  validation: { required: true, min: 0 }
                },
                {
                  key: 'receipt_attached',
                  label: '영수증',
                  type: 'checkbox' as any
                }
              ]
            }
          ]
        },
        {
          title: '첨부 파일',
          fields: [
            {
              key: 'receipts',
              label: '영수증 첨부',
              type: 'file' as any,
              maxFiles: 20,
              maxFileSize: 10,
              acceptedFormats: ['pdf', 'jpg', 'png', 'jpeg', 'heic'],
              helpText: '영수증을 스캔하거나 촬영하여 첨부해주세요',
              colSpan: 12
            },
            {
              key: 'notes',
              label: '추가 설명',
              type: 'textarea' as any,
              rows: 3,
              colSpan: 12
            }
          ]
        }
      ],
      settings: {
        submitButtonText: '정산 신청',
        saveAsDraft: true,
        confirmOnLeave: true
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    };
  }

  // 출장 계획 신청 스키마 (1단계)
  private getBusinessTripPlanSchema(): FormTemplateSchema {
    return {
      version: '1.0',
      title: '출장 계획 신청',
      description: '출장 계획 및 예산 승인을 위한 신청서입니다.',
      sections: [
        {
          title: '기본 정보',
          fields: [
            {
              key: 'employee_grade',
              label: '직급',
              type: 'select' as any,
              validation: { required: true },
              options: [
                { value: 'STAFF', label: 'Staff' },
                { value: 'SENIOR', label: 'Senior' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'DIRECTOR', label: 'Director' },
                { value: 'EXECUTIVE', label: 'Executive' }
              ],
              colSpan: 6
            },
            {
              key: 'request_date',
              label: '신청일',
              type: 'date' as any,
              validation: { required: true },
              defaultValue: new Date().toISOString().split('T')[0],
              colSpan: 6
            }
          ]
        },
        {
          title: '출장 정보',
          fields: [
            {
              key: 'trip_type',
              label: '출장 구분',
              type: 'radio' as any,
              validation: { required: true },
              options: [
                { value: 'domestic', label: '국내 출장' },
                { value: 'international', label: '해외 출장' }
              ],
              colSpan: 12
            },
            {
              key: 'destination',
              label: '출장지',
              type: 'text' as any,
              validation: { required: true },
              placeholder: '예: Jakarta, Surabaya, Singapore',
              colSpan: 6
            },
            {
              key: 'purpose',
              label: '출장 목적',
              type: 'textarea' as any,
              validation: { required: true },
              placeholder: '출장의 구체적인 목적과 업무 내용을 기술해주세요',
              rows: 3,
              colSpan: 6
            },
            {
              key: 'start_date',
              label: '출발일시',
              type: 'datetime' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'end_date',
              label: '복귀일시',
              type: 'datetime' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'attendees',
              label: '동행자',
              type: 'text' as any,
              placeholder: '동행자가 있는 경우 이름과 직급 입력',
              colSpan: 12
            }
          ]
        },
        {
          title: '예산 계획 (IDR)',
          fields: [
            {
              key: 'accommodation_budget',
              label: '숙박비',
              type: 'money' as any,
              validation: { required: true, min: 0 },
              currency: 'IDR',
              helpText: '1박 기준 예상 숙박비',
              colSpan: 6
            },
            {
              key: 'meal_budget',
              label: '식비',
              type: 'money' as any,
              validation: { required: true, min: 0 },
              currency: 'IDR',
              helpText: '1일 기준 예상 식비',
              colSpan: 6
            },
            {
              key: 'transportation_budget',
              label: '교통비',
              type: 'money' as any,
              validation: { required: true, min: 0 },
              currency: 'IDR',
              helpText: '항공료, 현지 교통비 포함',
              colSpan: 6
            },
            {
              key: 'miscellaneous_budget',
              label: '기타 비용',
              type: 'money' as any,
              validation: { min: 0 },
              currency: 'IDR',
              helpText: '비자, 보험, 기타 잡비',
              colSpan: 6
            },
            {
              key: 'total_budget',
              label: '총 예산',
              type: 'money' as any,
              validation: { required: true },
              currency: 'IDR',
              calculated: true,
              formula: 'accommodation_budget + meal_budget + transportation_budget + miscellaneous_budget',
              colSpan: 12
            }
          ]
        },
        {
          title: '상세 계획',
          fields: [
            {
              key: 'itinerary',
              label: '상세 일정',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 5,
              placeholder: '일자별 상세 일정과 업무 계획을 작성해주세요',
              colSpan: 12
            },
            {
              key: 'expected_outcome',
              label: '기대 성과',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 3,
              placeholder: '출장을 통해 달성하고자 하는 목표와 성과를 기술해주세요',
              colSpan: 12
            }
          ]
        }
      ],
      settings: {
        submitButtonText: '계획 승인 요청',
        cancelButtonText: '취소',
        saveAsDraft: true,
        autoSave: true,
        autoSaveInterval: 30
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    };
  }

  // 출장 비용 정산 스키마 (2단계)
  private getBusinessTripExpenseSchema(): FormTemplateSchema {
    return {
      version: '1.0',
      title: '출장 비용 정산',
      description: '출장 완료 후 실제 발생한 비용을 정산하는 신청서입니다.',
      sections: [
        {
          title: '출장 정보',
          fields: [
            {
              key: 'trip_plan_id',
              label: '출장 계획 번호',
              type: 'text' as any,
              validation: { required: true },
              placeholder: '승인된 출장 계획의 참조 번호',
              colSpan: 6
            },
            {
              key: 'actual_departure',
              label: '실제 출발일시',
              type: 'datetime' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'actual_return',
              label: '실제 복귀일시',
              type: 'datetime' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'days_count',
              label: '출장일수',
              type: 'number' as any,
              validation: { required: true, min: 1 },
              calculated: true,
              colSpan: 6
            }
          ]
        },
        {
          title: '비용 정산 내역',
          fields: [
            {
              key: 'expenses',
              label: '비용 항목',
              type: 'table' as any,
              validation: { required: true },
              allowAdd: true,
              allowDelete: true,
              minRows: 1,
              columns: [
                {
                  key: 'date',
                  label: '사용일',
                  type: 'date' as any,
                  validation: { required: true }
                },
                {
                  key: 'category',
                  label: '비용 유형',
                  type: 'select' as any,
                  validation: { required: true },
                  options: [
                    { value: 'accommodation', label: '숙박비' },
                    { value: 'meal', label: '식비' },
                    { value: 'transportation', label: '교통비' },
                    { value: 'miscellaneous', label: '기타' }
                  ]
                },
                {
                  key: 'description',
                  label: '상세 내용',
                  type: 'text' as any,
                  validation: { required: true },
                  placeholder: '호텔명, 식당명, 교통수단 등'
                },
                {
                  key: 'amount',
                  label: '금액 (IDR)',
                  type: 'money' as any,
                  validation: { required: true, min: 0 },
                  currency: 'IDR'
                },
                {
                  key: 'receipt_number',
                  label: '영수증 번호',
                  type: 'text' as any,
                  validation: { required: true },
                  placeholder: '첨부된 영수증의 번호'
                }
              ]
            }
          ]
        },
        {
          title: '정산 요약',
          fields: [
            {
              key: 'total_accommodation',
              label: '총 숙박비',
              type: 'money' as any,
              currency: 'IDR',
              calculated: true,
              colSpan: 6
            },
            {
              key: 'total_meal',
              label: '총 식비',
              type: 'money' as any,
              currency: 'IDR',
              calculated: true,
              colSpan: 6
            },
            {
              key: 'total_transportation',
              label: '총 교통비',
              type: 'money' as any,
              currency: 'IDR',
              calculated: true,
              colSpan: 6
            },
            {
              key: 'total_miscellaneous',
              label: '총 기타비용',
              type: 'money' as any,
              currency: 'IDR',
              calculated: true,
              colSpan: 6
            },
            {
              key: 'grand_total',
              label: '총 정산 금액',
              type: 'money' as any,
              currency: 'IDR',
              calculated: true,
              validation: { required: true },
              colSpan: 12
            }
          ]
        },
        {
          title: '첨부 문서',
          fields: [
            {
              key: 'receipts',
              label: '영수증 첨부',
              type: 'file' as any,
              validation: { required: true },
              maxFiles: 50,
              maxFileSize: 10,
              acceptedFormats: ['pdf', 'jpg', 'png', 'jpeg', 'heic'],
              helpText: '모든 영수증을 스캔하거나 촬영하여 첨부해주세요. 영수증 번호와 매칭되어야 합니다.',
              colSpan: 12
            },
            {
              key: 'additional_notes',
              label: '추가 설명',
              type: 'textarea' as any,
              rows: 3,
              placeholder: '특이사항이나 추가 설명이 있는 경우 작성해주세요',
              colSpan: 12
            }
          ]
        }
      ],
      settings: {
        submitButtonText: '비용 정산 신청',
        cancelButtonText: '취소',
        saveAsDraft: true,
        confirmOnLeave: true
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    };
  }

  // 출장 보고서 스키마 (3단계)
  private getBusinessTripReportSchema(): FormTemplateSchema {
    return {
      version: '1.0',
      title: '출장 보고서',
      description: '출장 완료 후 업무 성과와 결과를 보고하는 문서입니다.',
      sections: [
        {
          title: '출장 개요',
          fields: [
            {
              key: 'trip_plan_id',
              label: '출장 계획 번호',
              type: 'text' as any,
              validation: { required: true },
              placeholder: '승인된 출장 계획의 참조 번호',
              colSpan: 6
            },
            {
              key: 'expense_claim_id',
              label: '비용 정산 번호',
              type: 'text' as any,
              validation: { required: true },
              placeholder: '제출한 비용 정산의 참조 번호',
              colSpan: 6
            },
            {
              key: 'submission_date',
              label: '보고서 작성일',
              type: 'date' as any,
              validation: { required: true },
              defaultValue: new Date().toISOString().split('T')[0],
              colSpan: 6
            },
            {
              key: 'completion_status',
              label: '출장 완료 상태',
              type: 'select' as any,
              validation: { required: true },
              options: [
                { value: 'completed', label: '계획대로 완료' },
                { value: 'partial', label: '부분 완료' },
                { value: 'delayed', label: '지연 완료' },
                { value: 'cancelled', label: '취소/중단' }
              ],
              colSpan: 6
            }
          ]
        },
        {
          title: '업무 성과',
          fields: [
            {
              key: 'objectives_achieved',
              label: '달성한 목표',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 4,
              placeholder: '출장을 통해 달성한 구체적인 목표와 성과를 기술해주세요',
              colSpan: 12
            },
            {
              key: 'key_activities',
              label: '주요 활동 내역',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 5,
              placeholder: '출장 기간 중 수행한 주요 업무와 활동을 시간순으로 기술해주세요',
              colSpan: 12
            },
            {
              key: 'meetings_held',
              label: '미팅 및 면담',
              type: 'table' as any,
              allowAdd: true,
              allowDelete: true,
              columns: [
                {
                  key: 'date',
                  label: '날짜',
                  type: 'date' as any,
                  validation: { required: true }
                },
                {
                  key: 'attendees',
                  label: '참석자',
                  type: 'text' as any,
                  validation: { required: true },
                  placeholder: '이름, 직책, 회사명'
                },
                {
                  key: 'purpose',
                  label: '목적',
                  type: 'text' as any,
                  validation: { required: true }
                },
                {
                  key: 'outcome',
                  label: '결과',
                  type: 'text' as any,
                  validation: { required: true }
                }
              ],
              colSpan: 12
            }
          ]
        },
        {
          title: '성과 분석',
          fields: [
            {
              key: 'success_metrics',
              label: '성과 지표',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 3,
              placeholder: '정량적/정성적 성과 지표와 측정 결과를 기술해주세요',
              colSpan: 12
            },
            {
              key: 'challenges_faced',
              label: '어려움 및 제약사항',
              type: 'textarea' as any,
              rows: 3,
              placeholder: '출장 중 겪은 어려움이나 제약사항이 있다면 기술해주세요',
              colSpan: 12
            },
            {
              key: 'lessons_learned',
              label: '교훈 및 개선사항',
              type: 'textarea' as any,
              rows: 3,
              placeholder: '향후 출장이나 업무 개선을 위한 교훈과 제안사항을 기술해주세요',
              colSpan: 12
            }
          ]
        },
        {
          title: '후속 조치',
          fields: [
            {
              key: 'follow_up_actions',
              label: '후속 조치 계획',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 4,
              placeholder: '출장 결과에 따른 후속 업무 계획과 일정을 기술해주세요',
              colSpan: 12
            },
            {
              key: 'next_trip_recommendation',
              label: '추가 출장 필요성',
              type: 'radio' as any,
              validation: { required: true },
              options: [
                { value: 'none', label: '추가 출장 불필요' },
                { value: 'follow_up', label: '후속 출장 필요' },
                { value: 'regular', label: '정기적 출장 필요' }
              ],
              colSpan: 12
            },
            {
              key: 'next_trip_details',
              label: '추가 출장 계획',
              type: 'textarea' as any,
              conditional: {
                field: 'next_trip_recommendation',
                operator: 'not_equals',
                value: 'none'
              },
              rows: 3,
              placeholder: '추가 출장이 필요한 경우 목적과 시기를 기술해주세요',
              colSpan: 12
            }
          ]
        },
        {
          title: '첨부 자료',
          fields: [
            {
              key: 'supporting_documents',
              label: '관련 문서',
              type: 'file' as any,
              maxFiles: 20,
              maxFileSize: 10,
              acceptedFormats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'png'],
              helpText: '프레젠테이션 자료, 계약서, 사진 등 출장 성과를 뒷받침하는 자료를 첨부해주세요',
              colSpan: 12
            }
          ]
        }
      ],
      settings: {
        submitButtonText: '보고서 제출',
        cancelButtonText: '취소',
        saveAsDraft: true,
        confirmOnLeave: true
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    };
  }

  // 재택근무 신청 스키마
  private getRemoteWorkSchema(): FormTemplateSchema {
    return {
      version: '1.0',
      title: '재택근무 신청',
      sections: [
        {
          title: '재택근무 신청',
          fields: [
            {
              key: 'work_date',
              label: '근무일',
              type: 'date' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'work_type',
              label: '근무 형태',
              type: 'select' as any,
              validation: { required: true },
              options: [
                { value: 'full_day', label: '전일 재택' },
                { value: 'morning', label: '오전 재택' },
                { value: 'afternoon', label: '오후 재택' }
              ],
              colSpan: 6
            },
            {
              key: 'reason',
              label: '신청 사유',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 3,
              colSpan: 12
            },
            {
              key: 'work_plan',
              label: '업무 계획',
              type: 'textarea' as any,
              validation: { required: true },
              rows: 4,
              placeholder: '재택근무 시 수행할 업무를 구체적으로 작성해주세요',
              colSpan: 12
            },
            {
              key: 'contact_number',
              label: '비상 연락처',
              type: 'phone' as any,
              validation: { required: true },
              colSpan: 6
            },
            {
              key: 'work_location',
              label: '근무 장소',
              type: 'text' as any,
              validation: { required: true },
              placeholder: '예: 자택, 카페 등',
              colSpan: 6
            }
          ]
        }
      ],
      settings: {
        submitButtonText: '신청하기',
        saveAsDraft: false
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    };
  }

  // 템플릿 코드 생성
  private generateTemplateCode(name: string): string {
    const timestamp = Date.now().toString(36);
    const nameCode = name
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .substring(0, 10)
      .toUpperCase();
    return `${nameCode}_${timestamp}`;
  }
}