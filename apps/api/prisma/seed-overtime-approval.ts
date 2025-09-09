import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting overtime approval categories seed...');

  // Get the demo company and tenant
  const company = await prisma.company.findFirst({
    where: { id: 'company-demo' }
  });

  if (!company) {
    console.log('❌ Demo company not found. Please run the main seed first.');
    return;
  }

  const tenant = await prisma.tenant.findFirst({
    where: { domain: 'demo.reko-hr.com' }
  });

  if (!tenant) {
    console.log('❌ Demo tenant not found. Please run the main seed first.');
    return;
  }

  // Create overtime approval category
  const overtimeCategory = await prisma.approval_category.upsert({
    where: { 
      code_company_id: {
        code: 'OVERTIME_REQUEST',
        company_id: company.id
      }
    },
    update: {},
    create: {
      company_id: company.id,
      code: 'OVERTIME_REQUEST',
      name: '추가근무 신청',
      description: '야근, 주말근무, 특근(공휴일), 조기출근 등 추가근무 신청을 위한 전자결재 양식',
      form_schema: {
        type: 'object',
        properties: {
          overtime_type: {
            type: 'string',
            title: '추가근무 유형',
            enum: ['EVENING', 'WEEKEND', 'HOLIDAY', 'EARLY'],
            enumNames: ['야근', '주말근무', '특근(공휴일)', '조기출근'],
            description: '추가근무의 유형을 선택하세요'
          },
          work_date: {
            type: 'string',
            format: 'date',
            title: '근무일자',
            description: '추가근무를 진행할 날짜를 선택하세요'
          },
          start_time: {
            type: 'string',
            format: 'date-time',
            title: '시작시간',
            description: '추가근무 시작 시간을 입력하세요'
          },
          end_time: {
            type: 'string',
            format: 'date-time',
            title: '종료시간',
            description: '추가근무 종료 시간을 입력하세요'
          },
          total_hours: {
            type: 'number',
            title: '총 근무시간',
            minimum: 0.5,
            maximum: 12,
            description: '총 추가근무 시간 (시간 단위)'
          },
          work_description: {
            type: 'string',
            title: '업무내용',
            minLength: 10,
            maxLength: 1000,
            description: '구체적인 추가근무 내용을 작성하세요'
          },
          reason: {
            type: 'string',
            title: '추가근무 사유',
            minLength: 10,
            maxLength: 500,
            description: '추가근무가 필요한 사유를 작성하세요'
          },
          emergency_level: {
            type: 'string',
            title: '긴급도',
            enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
            enumNames: ['낮음', '보통', '높음', '긴급'],
            default: 'NORMAL',
            description: '업무의 긴급도를 선택하세요'
          },
          requires_manager_approval: {
            type: 'boolean',
            title: '팀장 승인 필요',
            default: true,
            description: '직속 상관의 사전 승인을 받았는지 확인하세요'
          },
          expected_completion: {
            type: 'string',
            title: '완료 예상 결과',
            maxLength: 300,
            description: '추가근무를 통해 달성하고자 하는 결과를 간략히 작성하세요'
          }
        },
        required: [
          'overtime_type', 
          'work_date', 
          'start_time', 
          'end_time', 
          'total_hours',
          'work_description', 
          'reason'
        ],
        additionalProperties: false
      },
      is_active: true,
      order_index: 1
    }
  });

  console.log('✅ Created overtime approval category:', overtimeCategory.name);

  // Get some users for default approval route
  const manager = await prisma.auth_user.findFirst({
    where: { email: 'hr@nova-hr.com' }
  });

  const admin = await prisma.auth_user.findFirst({
    where: { email: 'admin@nova-hr.com' }
  });

  if (manager && admin) {
    // Create default approval route template for overtime requests
    const defaultRoute = await prisma.approval_route_template.upsert({
      where: {
        id: 'overtime-default-route'
      },
      update: {},
      create: {
        id: 'overtime-default-route',
        tenant_id: tenant.id,
        company_id: company.id,
        category_id: overtimeCategory.id,
        name: '추가근무 기본 결재선',
        description: '추가근무 신청의 기본 승인 경로',
        is_default: true,
        conditions: {
          overtime_types: ['EVENING', 'WEEKEND', 'HOLIDAY', 'EARLY'],
          max_hours: 12
        }
      }
    });

    // Create approval route stages
    const approvalStage = await prisma.approval_route_stage_template.create({
      data: {
        template_id: defaultRoute.id,
        type: 'APPROVAL',
        mode: 'SEQUENTIAL',
        order_index: 1,
        name: '팀장 승인'
      }
    });

    const finalApprovalStage = await prisma.approval_route_stage_template.create({
      data: {
        template_id: defaultRoute.id,
        type: 'APPROVAL',
        mode: 'SEQUENTIAL',
        order_index: 2,
        name: '최종 승인'
      }
    });

    // Create approvers for each stage
    await prisma.approval_route_approver_template.create({
      data: {
        stage_id: approvalStage.id,
        user_id: manager.id,
        order_index: 1
      }
    });

    await prisma.approval_route_approver_template.create({
      data: {
        stage_id: finalApprovalStage.id,
        user_id: admin.id,
        order_index: 1
      }
    });

    console.log('✅ Created default approval route template');
  }

  // Create overtime policy categories in common codes
  try {
    const overtimePolicyCategory = await prisma.common_code_category.upsert({
      where: {
        id: 'overtime-policy-category'
      },
      update: {},
      create: {
        id: 'overtime-policy-category',
        company_id: company.id,
        category_code: 'OVERTIME_POLICY',
        category_name: '추가근무 정책',
        description: '추가근무 관련 정책 및 규정',
        sort_order: 110,
        is_active: true
      }
    });

    // Add overtime policy codes
    const overtimePolicyCodes = [
      {
        id: 'overtime-policy-max-daily',
        code: 'MAX_DAILY_HOURS',
        name: '일일 최대 추가근무 시간',
        description: '하루 최대 추가근무 가능 시간',
        extra_data: { value: '12', unit: 'hours' },
        sort_order: 1
      },
      {
        id: 'overtime-policy-advance-notice',
        code: 'ADVANCE_NOTICE',
        name: '사전 신청 필수 시간',
        description: '추가근무 사전 신청 필수 시간',
        extra_data: { value: '2', unit: 'hours' },
        sort_order: 2
      },
      {
        id: 'overtime-policy-weekend-approval',
        code: 'WEEKEND_APPROVAL',
        name: '주말근무 승인 필수',
        description: '주말 추가근무 시 승인 필요 여부',
        extra_data: { value: true, type: 'boolean' },
        sort_order: 3
      },
      {
        id: 'overtime-policy-holiday-approval',
        code: 'HOLIDAY_APPROVAL',
        name: '공휴일근무 승인 필수',
        description: '공휴일 추가근무 시 승인 필요 여부',
        extra_data: { value: true, type: 'boolean' },
        sort_order: 4
      }
    ];

    for (const policyCode of overtimePolicyCodes) {
      await prisma.common_code.upsert({
        where: {
          id: policyCode.id
        },
        update: {},
        create: {
          category_id: overtimePolicyCategory.id,
          ...policyCode,
          is_active: true
        }
      });
    }

    console.log('✅ Created overtime policy common codes');
  } catch (error) {
    console.log('⚠️  Overtime policy codes may already exist:', error.message);
  }

  console.log('🎉 Overtime approval seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error in overtime approval seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });