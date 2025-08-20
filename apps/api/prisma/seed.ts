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
  const hrManager = await prisma.auth_user.create({
    data: {
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
  const employee = await prisma.auth_user.create({
    data: {
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
  await prisma.employee_profile.create({
    data: {
      user_id: adminUser.id,
      emp_no: 'EMP001',
      department: '개발팀',
      hire_date: new Date('2020-01-01'),
      base_location_id: location.id,
      employment_type: 'FULL_TIME',
      salary: 80000000,
    },
  });

  await prisma.employee_profile.create({
    data: {
      user_id: hrManager.id,
      emp_no: 'EMP002',
      department: 'HR팀',
      hire_date: new Date('2021-03-01'),
      base_location_id: location.id,
      employment_type: 'FULL_TIME',
      salary: 60000000,
    },
  });

  await prisma.employee_profile.create({
    data: {
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
      icon: 'receipt',
      form_schema: {
        type: 'object',
        properties: {
          amount: { type: 'number', title: '금액' },
          currency: { type: 'string', title: '통화', default: 'KRW' },
          category: { type: 'string', title: '비용 분류', enum: ['교통비', '식비', '숙박비', '기타'] },
          description: { type: 'string', title: '사용 내역' },
          receipt_date: { type: 'string', format: 'date', title: '영수증 날짜' },
        },
        required: ['amount', 'category', 'description', 'receipt_date'],
      },
    },
    {
      name: '회사용품 요청',
      code: 'SUPPLY_REQUEST',
      description: '사무용품 및 장비 요청',
      icon: 'package',
      form_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            title: '요청 품목',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', title: '품목명' },
                quantity: { type: 'number', title: '수량' },
                reason: { type: 'string', title: '요청 사유' },
              },
              required: ['name', 'quantity', 'reason'],
            },
          },
          urgency: { type: 'string', title: '긴급도', enum: ['낮음', '보통', '높음'] },
          delivery_date: { type: 'string', format: 'date', title: '희망 납기일' },
        },
        required: ['items', 'urgency'],
      },
    },
  ];

  for (const category of categories) {
    await prisma.approval_category.create({
      data: category,
    });
  }

  console.log('✅ Created approval categories');

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