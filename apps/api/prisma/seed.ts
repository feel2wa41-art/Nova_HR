import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'demo.nova-hr.com' },
    update: {},
    create: {
      name: 'Demo Company',
      domain: 'demo.nova-hr.com',
      status: 'ACTIVE',
      plan: 'PREMIUM',
      max_users: 500,
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        language: 'ko',
      },
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create company
  const company = await prisma.company.upsert({
    where: { id: 'company-demo' },
    update: {},
    create: {
      id: 'company-demo',
      tenant_id: tenant.id,
      name: '(주)노바HR',
      biz_no: '123-45-67890',
      ceo_name: '김대표',
      phone: '+82-2-1234-5678',
      email: 'info@nova-hr.com',
      address: '서울특별시 강남구 테헤란로 123',
      timezone: 'Asia/Seoul',
      currency: 'KRW',
      settings: {
        workingDays: [1, 2, 3, 4, 5],
        workingHours: {
          start: '09:00',
          end: '18:00',
          lunch: { start: '12:00', end: '13:00' },
        },
      },
    },
  });

  console.log('✅ Created company:', company.name);

  // Create company location
  const location = await prisma.company_location.create({
    data: {
      company_id: company.id,
      name: '본사',
      code: 'HQ',
      address: '서울특별시 강남구 테헤란로 123',
      lat: 37.5665,
      lng: 126.978,
      radius_m: 200,
      wifi_ssids: ['NovaHR-WiFi', 'NovaHR-Guest'],
      ip_cidrs: ['192.168.1.0/24'],
      web_checkin_allowed: true,
      face_required: false,
    },
  });

  console.log('✅ Created location:', location.name);

  // Create org units
  const rootOrg = await prisma.org_unit.create({
    data: {
      company_id: company.id,
      name: '(주)노바HR',
      code: 'ROOT',
      description: '최상위 조직',
      order_index: 0,
    },
  });

  const devTeam = await prisma.org_unit.create({
    data: {
      company_id: company.id,
      parent_id: rootOrg.id,
      name: '개발팀',
      code: 'DEV',
      description: '소프트웨어 개발팀',
      order_index: 1,
    },
  });

  const hrTeam = await prisma.org_unit.create({
    data: {
      company_id: company.id,
      parent_id: rootOrg.id,
      name: 'HR팀',
      code: 'HR',
      description: '인사팀',
      order_index: 2,
    },
  });

  console.log('✅ Created org units');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.auth_user.upsert({
    where: { email: 'admin@nova-hr.com' },
    update: {},
    create: {
      email: 'admin@nova-hr.com',
      password: hashedPassword,
      name: '시스템 관리자',
      title: 'IT 관리자',
      phone: '+82-10-1234-5678',
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      tenant_id: tenant.id,
      org_id: devTeam.id,
    },
  });

  // Create HR manager
  const hrManager = await prisma.auth_user.upsert({
    where: { email: 'hr@nova-hr.com' },
    update: {},
    create: {
      email: 'hr@nova-hr.com',
      password: hashedPassword,
      name: '김인사',
      title: 'HR 매니저',
      phone: '+82-10-2345-6789',
      status: 'ACTIVE',
      role: 'HR_MANAGER',
      tenant_id: tenant.id,
      org_id: hrTeam.id,
    },
  });

  // Create regular employee
  const employee = await prisma.auth_user.upsert({
    where: { email: 'employee@nova-hr.com' },
    update: {},
    create: {
      email: 'employee@nova-hr.com',
      password: hashedPassword,
      name: '홍길동',
      title: '시니어 개발자',
      phone: '+82-10-3456-7890',
      status: 'ACTIVE',
      role: 'EMPLOYEE',
      tenant_id: tenant.id,
      org_id: devTeam.id,
    },
  });

  console.log('✅ Created users');

  // Create employee profiles
  await prisma.employee_profile.upsert({
    where: { user_id: adminUser.id },
    update: {},
    create: {
      user_id: adminUser.id,
      emp_no: 'EMP001',
      department: '개발팀',
      hire_date: new Date('2020-01-01'),
      base_location_id: location.id,
      employment_type: 'FULL_TIME',
      salary: 80000000,
    },
  });

  await prisma.employee_profile.upsert({
    where: { user_id: hrManager.id },
    update: {},
    create: {
      user_id: hrManager.id,
      emp_no: 'EMP002',
      department: 'HR팀',
      hire_date: new Date('2021-03-01'),
      base_location_id: location.id,
      employment_type: 'FULL_TIME',
      salary: 60000000,
    },
  });

  await prisma.employee_profile.upsert({
    where: { user_id: employee.id },
    update: {},
    create: {
      user_id: employee.id,
      emp_no: 'EMP003',
      department: '개발팀',
      hire_date: new Date('2023-06-01'),
      base_location_id: location.id,
      employment_type: 'FULL_TIME',
      salary: 50000000,
    },
  });

  console.log('✅ Created employee profiles');

  // Create work policy
  await prisma.work_policy.create({
    data: {
      company_id: company.id,
      name: '기본 근무 정책',
      description: '표준 9-6 근무제',
      work_days: [1, 2, 3, 4, 5],
      start_time: '09:00',
      end_time: '18:00',
      lunch_start: '12:00',
      lunch_end: '13:00',
      late_threshold: 15,
      early_threshold: 15,
      rounding_mode: 'UP_5',
      backdate_days: 7,
      geofence_strict: true,
      face_required: false,
      web_checkin: true,
      is_default: true,
    },
  });

  console.log('✅ Created work policy');

  // Create leave types
  const leaveTypes = [
    { name: '연차', code: 'ANNUAL', max_days_year: 15, carry_forward: true, color_hex: '#3b82f6' },
    { name: '병가', code: 'SICK', max_days_year: 10, carry_forward: false, color_hex: '#ef4444' },
    { name: '출산휴가', code: 'MATERNITY', max_days_year: 90, carry_forward: false, color_hex: '#ec4899' },
    { name: '육아휴직', code: 'PATERNITY', max_days_year: 5, carry_forward: false, color_hex: '#8b5cf6' },
    { name: '개인사유', code: 'PERSONAL', max_days_year: 3, carry_forward: false, color_hex: '#f59e0b' },
  ];

  for (const leaveType of leaveTypes) {
    await prisma.leave_type.create({
      data: {
        ...leaveType,
        description: `${leaveType.name} 휴가`,
        requires_approval: true,
        deduct_weekends: false,
        is_paid: true,
        is_active: true,
      },
    });
  }

  console.log('✅ Created leave types');

  // Create leave balances for users
  const currentYear = new Date().getFullYear();
  const users = [adminUser, hrManager, employee];
  
  for (const user of users) {
    for (const leaveType of leaveTypes) {
      await prisma.leave_balance.create({
        data: {
          user_id: user.id,
          leave_type: leaveType.code,
          year: currentYear,
          allocated: leaveType.max_days_year || 0,
          used: 0,
          pending: 0,
          carried: 0,
        },
      });
    }
  }

  console.log('✅ Created leave balances');

  // Create approval categories
  const categories = [
    {
      name: '비용 청구',
      code: 'REIMBURSEMENT',
      description: '업무 관련 비용 청구',
      icon: '💳',
      form_schema: {
        fields: [
          { key: 'amount', label: '금액', type: 'number', required: true, placeholder: '금액을 입력하세요' },
          { key: 'category', label: '비용 분류', type: 'select', required: true, 
            options: [
              { label: '교통비', value: 'TRANSPORT' },
              { label: '식비', value: 'MEAL' },
              { label: '숙박비', value: 'ACCOMMODATION' },
              { label: '교육비', value: 'EDUCATION' },
              { label: '기타', value: 'OTHER' }
            ]
          },
          { key: 'description', label: '사용 내역', type: 'textarea', required: true, 
            placeholder: '비용 사용 내역을 상세히 입력해주세요',
            validation: { max: 500 }
          },
          { key: 'receipt_date', label: '영수증 날짜', type: 'date', required: true },
          { key: 'vendor', label: '사용처', type: 'text', required: false, placeholder: '사용한 업체명' }
        ]
      },
      order_index: 1,
      is_active: true,
    },
    {
      name: '회사용품 요청',
      code: 'SUPPLY_REQUEST', 
      description: '사무용품 및 장비 요청',
      icon: '📦',
      form_schema: {
        fields: [
          { key: 'item_name', label: '품목명', type: 'text', required: true, placeholder: '요청할 품목명을 입력하세요' },
          { key: 'quantity', label: '수량', type: 'number', required: true, validation: { min: 1 } },
          { key: 'category', label: '분류', type: 'select', required: true,
            options: [
              { label: '사무용품', value: 'OFFICE' },
              { label: 'IT 장비', value: 'IT' },
              { label: '가구', value: 'FURNITURE' },
              { label: '소모품', value: 'CONSUMABLES' }
            ]
          },
          { key: 'urgency', label: '긴급도', type: 'select', required: true,
            options: [
              { label: '낮음', value: 'LOW' },
              { label: '보통', value: 'MEDIUM' },
              { label: '높음', value: 'HIGH' }
            ]
          },
          { key: 'reason', label: '요청 사유', type: 'textarea', required: true,
            placeholder: '품목이 필요한 사유를 설명해주세요',
            validation: { max: 300 }
          },
          { key: 'delivery_date', label: '희망 납기일', type: 'date', required: false }
        ]
      },
      order_index: 2,
      is_active: true,
    },
    {
      name: '휴가 신청',
      code: 'LEAVE_REQUEST',
      description: '연차/병가 등 휴가 신청',
      icon: '🏖️',
      form_schema: {
        fields: [
          { key: 'leave_type', label: '휴가 유형', type: 'select', required: true,
            options: [
              { label: '연차', value: 'ANNUAL' },
              { label: '병가', value: 'SICK' },
              { label: '개인사유', value: 'PERSONAL' },
              { label: '경조사', value: 'FAMILY_EVENT' }
            ]
          },
          { key: 'start_date', label: '시작일', type: 'date', required: true },
          { key: 'end_date', label: '종료일', type: 'date', required: true },
          { key: 'duration', label: '기간', type: 'select', required: true,
            options: [
              { label: '전일', value: 'FULL_DAY' },
              { label: '오전 반차', value: 'AM_HALF' },
              { label: '오후 반차', value: 'PM_HALF' }
            ]
          },
          { key: 'reason', label: '사유', type: 'textarea', required: true,
            placeholder: '휴가 사유를 입력해주세요',
            validation: { max: 200 }
          },
          { key: 'emergency_contact', label: '비상연락처', type: 'text', required: false,
            placeholder: '긴급시 연락 가능한 번호' }
        ]
      },
      order_index: 3,
      is_active: true,
    },
    {
      name: '출장 신청',
      code: 'BUSINESS_TRIP',
      description: '국내외 출장 신청',
      icon: '✈️',
      form_schema: {
        fields: [
          { key: 'destination', label: '출장지', type: 'text', required: true, placeholder: '출장 목적지를 입력하세요' },
          { key: 'start_date', label: '출발일', type: 'date', required: true },
          { key: 'end_date', label: '복귀일', type: 'date', required: true },
          { key: 'purpose', label: '출장 목적', type: 'textarea', required: true,
            placeholder: '출장의 목적과 주요 업무를 설명해주세요',
            validation: { max: 500 }
          },
          { key: 'transportation', label: '교통수단', type: 'select', required: true,
            options: [
              { label: '항공', value: 'AIR' },
              { label: '기차', value: 'TRAIN' },
              { label: '버스', value: 'BUS' },
              { label: '자가용', value: 'CAR' }
            ]
          },
          { key: 'accommodation', label: '숙박 필요', type: 'select', required: true,
            options: [
              { label: '필요', value: 'YES' },
              { label: '불필요', value: 'NO' }
            ]
          },
          { key: 'estimated_cost', label: '예상 비용', type: 'number', required: false, placeholder: '예상되는 총 비용' }
        ]
      },
      order_index: 4,
      is_active: true,
    },
    {
      name: '교육 신청',
      code: 'TRAINING_REQUEST',
      description: '외부 교육/세미나 참석 신청',
      icon: '📚',
      form_schema: {
        fields: [
          { key: 'course_name', label: '교육명', type: 'text', required: true, placeholder: '교육/세미나 제목' },
          { key: 'provider', label: '교육기관', type: 'text', required: true, placeholder: '교육을 제공하는 기관명' },
          { key: 'start_date', label: '시작일', type: 'date', required: true },
          { key: 'end_date', label: '종료일', type: 'date', required: true },
          { key: 'cost', label: '교육비', type: 'number', required: true, placeholder: '교육비 금액' },
          { key: 'justification', label: '신청 사유', type: 'textarea', required: true,
            placeholder: '교육이 업무에 미칠 긍정적 영향과 필요성을 설명해주세요',
            validation: { max: 600 }
          },
          { key: 'online_offline', label: '교육 방식', type: 'select', required: true,
            options: [
              { label: '온라인', value: 'ONLINE' },
              { label: '오프라인', value: 'OFFLINE' },
              { label: '하이브리드', value: 'HYBRID' }
            ]
          }
        ]
      },
      order_index: 5,
      is_active: true,
    }
  ];

  const createdCategories = [];
  for (const category of categories) {
    const created = await prisma.approval_category.create({
      data: category,
    });
    createdCategories.push(created);
  }

  console.log('✅ Created approval categories');

  // Create sample approval drafts
  const sampleDrafts = [
    {
      user_id: employee.id,
      category_id: createdCategories[0].id, // 비용 청구
      title: '클라이언트 미팅 교통비 청구',
      content: {
        amount: 35000,
        category: 'TRANSPORT',
        description: '강남역 - 판교역 택시비 (클라이언트 미팅 참석)',
        receipt_date: '2024-01-15',
        vendor: '카카오택시'
      },
      status: 'SUBMITTED',
      submitted_at: new Date('2024-01-16T09:30:00'),
    },
    {
      user_id: employee.id,
      category_id: createdCategories[2].id, // 휴가 신청
      title: '연차 휴가 신청 (개인 사유)',
      content: {
        leave_type: 'ANNUAL',
        start_date: '2024-01-25',
        end_date: '2024-01-26',
        duration: 'FULL_DAY',
        reason: '개인 업무 처리를 위한 연차 사용',
        emergency_contact: '010-1234-5678'
      },
      status: 'DRAFT',
    },
    {
      user_id: hrManager.id,
      category_id: createdCategories[1].id, // 회사용품 요청
      title: '신입사원 업무용 노트북 요청',
      content: {
        item_name: 'MacBook Pro 14인치',
        quantity: 2,
        category: 'IT',
        urgency: 'HIGH',
        reason: '신입사원 2명 입사 예정으로 업무용 노트북 필요',
        delivery_date: '2024-01-30'
      },
      status: 'IN_PROGRESS',
      submitted_at: new Date('2024-01-10T14:00:00'),
    }
  ];

  // Create sample approval drafts with routes and approvers
  const createdDrafts = [];
  for (const draft of sampleDrafts) {
    const createdDraft = await prisma.approval_draft.create({
      data: draft,
    });
    createdDrafts.push(createdDraft);
  }

  // Create approval routes for submitted/in-progress drafts
  for (const draft of createdDrafts) {
    if (draft.status === 'SUBMITTED' || draft.status === 'IN_PROGRESS') {
      // Create route
      const route = await prisma.approval_route.create({
        data: {
          draft_id: draft.id,
        },
      });

      // Create stages
      const cooperationStage = await prisma.approval_route_stage.create({
        data: {
          route_id: route.id,
          type: 'COOPERATION',
          mode: 'PARALLEL',
          rule: 'ALL',
          name: '협조',
          order_index: 1,
          status: draft.status === 'IN_PROGRESS' ? 'COMPLETED' : 'PENDING',
        },
      });

      const approvalStage = await prisma.approval_route_stage.create({
        data: {
          route_id: route.id,
          type: 'APPROVAL',
          mode: 'SEQUENTIAL',
          rule: 'ALL',
          name: '결재',
          order_index: 2,
          status: 'PENDING',
        },
      });

      // Add approvers
      await prisma.approval_route_approver.create({
        data: {
          stage_id: cooperationStage.id,
          user_id: hrManager.id,
          order_index: 1,
          status: draft.status === 'IN_PROGRESS' ? 'APPROVED' : 'PENDING',
          ...(draft.status === 'IN_PROGRESS' && { acted_at: new Date() }),
        },
      });

      await prisma.approval_route_approver.create({
        data: {
          stage_id: approvalStage.id,
          user_id: adminUser.id,
          order_index: 1,
          status: 'PENDING',
        },
      });

      // Create actions
      await prisma.approval_action.create({
        data: {
          draft_id: draft.id,
          user_id: draft.user_id,
          action: 'SUBMIT',
          comments: '결재 요청드립니다.',
          created_at: draft.submitted_at || new Date(),
        },
      });

      if (draft.status === 'IN_PROGRESS') {
        await prisma.approval_action.create({
          data: {
            draft_id: draft.id,
            user_id: hrManager.id,
            action: 'APPROVE',
            comments: '검토 완료하였습니다.',
            created_at: new Date(),
          },
        });
      }
    }
  }

  console.log('✅ Created sample approval drafts with routes and approvers');

  // Create codebook entries
  const codebookEntries = [
    // Attendance reasons
    { group_code: 'ATTEND_REASON', code: 'REMOTE', name: '재택근무', description: '재택근무로 인한 원격 체크인' },
    { group_code: 'ATTEND_REASON', code: 'OFFSITE', name: '외근', description: '고객사 방문 등 외근' },
    { group_code: 'ATTEND_REASON', code: 'EQUIPMENT', name: '장비 고장', description: '출입 장비 고장' },
    { group_code: 'ATTEND_REASON', code: 'EMERGENCY', name: '긴급상황', description: '응급상황으로 인한 예외' },
    { group_code: 'ATTEND_REASON', code: 'OTHER', name: '기타', description: '기타 사유' },
    
    // Leave reasons
    { group_code: 'LEAVE_REASON', code: 'VACATION', name: '휴가', description: '개인 휴가' },
    { group_code: 'LEAVE_REASON', code: 'SICK', name: '병가', description: '질병으로 인한 휴가' },
    { group_code: 'LEAVE_REASON', code: 'FAMILY', name: '가족 사유', description: '가족 관련 사유' },
    { group_code: 'LEAVE_REASON', code: 'OFFICIAL', name: '공적 사유', description: '공적 업무로 인한 휴가' },
  ];

  for (const entry of codebookEntries) {
    await prisma.codebook.create({
      data: {
        ...entry,
        order_index: 0,
        is_active: true,
      },
    });
  }

  console.log('✅ Created codebook entries');

  // Create sample attendance records for the past week
  const today = new Date();
  const pastWeek = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    return date;
  }).reverse();

  for (const date of pastWeek) {
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const user of [employee]) {
      const checkInTime = new Date(date);
      checkInTime.setHours(9, Math.floor(Math.random() * 30), 0, 0); // 9:00-9:30

      const checkOutTime = new Date(date);
      checkOutTime.setHours(18, Math.floor(Math.random() * 60), 0, 0); // 18:00-18:59

      await prisma.attendance.create({
        data: {
          user_id: user.id,
          date_key: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          check_in_at: checkInTime,
          check_in_loc: {
            lat: 37.5665 + (Math.random() - 0.5) * 0.001,
            lng: 126.978 + (Math.random() - 0.5) * 0.001,
            accuracy: 10,
            address: '서울특별시 강남구 테헤란로 123',
          },
          check_out_at: checkOutTime,
          check_out_loc: {
            lat: 37.5665 + (Math.random() - 0.5) * 0.001,
            lng: 126.978 + (Math.random() - 0.5) * 0.001,
            accuracy: 15,
            address: '서울특별시 강남구 테헤란로 123',
          },
          status: checkInTime.getHours() === 9 && checkInTime.getMinutes() <= 15 ? 'NORMAL' : 'LATE',
          work_minutes: Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)) - 60, // minus lunch
          break_minutes: 60,
        },
      });
    }
  }

  console.log('✅ Created sample attendance records');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📧 Test accounts:');
  console.log('Admin: admin@nova-hr.com / admin123');
  console.log('HR Manager: hr@nova-hr.com / admin123');
  console.log('Employee: employee@nova-hr.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });