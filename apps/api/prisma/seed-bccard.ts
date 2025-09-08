import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Adding BC카드 company and test user...');

  // Create BC카드 company
  const bcCardCompany = await prisma.company.create({
    data: {
      name: 'BC카드',
      name_en: 'BC Card',
      business_number: '214-81-14325',
      address: '서울특별시 중구 청계천로 14',
      phone: '02-2011-1234',
      email: 'contact@bccard.com',
      website: 'https://www.bccard.com',
      logo_url: null,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create BC카드 main location
  const bcCardLocation = await prisma.company_location.create({
    data: {
      company_id: bcCardCompany.id,
      name: '본사',
      address: '서울특별시 중구 청계천로 14',
      latitude: 37.5659,
      longitude: 126.9784,
      geofence_radius: 200,
      is_main: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create organization unit
  const bcCardOrgUnit = await prisma.org_unit.create({
    data: {
      company_id: bcCardCompany.id,
      name: 'IT개발팀',
      name_en: 'IT Development Team',
      parent_id: null,
      level: 1,
      sort_order: 1,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create tank.kim@bccard-ap.com user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const tankUser = await prisma.auth_user.create({
    data: {
      email: 'tank.kim@bccard-ap.com',
      password_hash: hashedPassword,
      first_name: 'Tank',
      last_name: 'Kim',
      phone: '010-1234-5678',
      role: 'ADMIN',
      status: 'ACTIVE',
      language: 'ko',
      timezone: 'Asia/Seoul',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create employee profile for tank user
  await prisma.employee_profile.create({
    data: {
      user_id: tankUser.id,
      company_id: bcCardCompany.id,
      org_unit_id: bcCardOrgUnit.id,
      employee_number: 'BC2024001',
      position: '시니어 개발자',
      job_title: 'Senior Developer',
      hire_date: new Date('2024-01-01'),
      employment_type: 'FULL_TIME',
      work_location_id: bcCardLocation.id,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create work policy for BC카드
  await prisma.work_policy.create({
    data: {
      company_id: bcCardCompany.id,
      name: 'BC카드 근무정책',
      standard_hours_per_day: 8,
      standard_days_per_week: 5,
      work_start_time: '09:00:00',
      work_end_time: '18:00:00',
      break_minutes: 60,
      allow_flexible_time: true,
      flexible_start_range: 120,
      flexible_end_range: 120,
      require_geofence: true,
      geofence_radius: 200,
      overtime_rate: 1.5,
      night_work_rate: 1.3,
      holiday_work_rate: 2.0,
      is_default: true,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create leave balance for tank user
  const currentYear = new Date().getFullYear();
  const leaveTypes = await prisma.leave_type.findMany();
  
  for (const leaveType of leaveTypes) {
    await prisma.leave_balance.create({
      data: {
        user_id: tankUser.id,
        leave_type: leaveType.code,
        year: currentYear,
        total_days: leaveType.default_days || 15,
        used_days: 0,
        remaining_days: leaveType.default_days || 15,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  console.log('✅ BC카드 company created:', bcCardCompany.name);
  console.log('✅ BC카드 location created:', bcCardLocation.name);
  console.log('✅ BC카드 org unit created:', bcCardOrgUnit.name);
  console.log('✅ Tank user created:', tankUser.email);
  console.log('');
  console.log('🔐 Test login credentials:');
  console.log('   Email: tank.kim@bccard-ap.com');
  console.log('   Password: admin123');
  console.log('   Company: BC카드');
}

main()
  .catch((e) => {
    console.error('❌ BC카드 seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });