import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 Adding BC카드 tenant, company and test user...');

  // First create a tenant for BC카드
  const bcCardTenant = await prisma.tenant.create({
    data: {
      name: 'BC카드',
      domain: 'bccard.com',
      status: 'ACTIVE',
      plan: 'PREMIUM',
      max_users: 500
    },
  });

  // Create BC카드 company with correct schema fields
  const bcCardCompany = await prisma.company.create({
    data: {
      tenant_id: bcCardTenant.id,
      name: 'BC카드',
      biz_no: '214-81-14325',
      address: '서울특별시 중구 청계천로 14',
      phone: '02-2011-1234',
      email: 'contact@bccard.com',
      ceo_name: '최원석',
      timezone: 'Asia/Seoul',
      currency: 'KRW'
    },
  });

  // Create BC카드 main location with correct fields
  const bcCardLocation = await prisma.company_location.create({
    data: {
      company_id: bcCardCompany.id,
      name: '본사',
      address: '서울특별시 중구 청계천로 14',
      lat: 37.5659,
      lng: 126.9784,
      radius_m: 200,
      wifi_ssids: ['BC_CARD_HQ'],
      ip_cidrs: ['192.168.1.0/24'],
      web_checkin_allowed: true,
      face_required: false,
      status: 'ACTIVE'
    },
  });

  // Create organization unit with correct fields
  const bcCardOrgUnit = await prisma.org_unit.create({
    data: {
      company_id: bcCardCompany.id,
      name: 'IT개발팀',
      parent_id: null,
      code: 'IT_DEV',
      description: 'IT 개발 및 시스템 운영팀',
      order_index: 1,
      status: 'ACTIVE'
    },
  });

  // Create tank.kim@bccard-ap.com user with correct fields
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const tankUser = await prisma.auth_user.create({
    data: {
      email: 'tank.kim@bccard-ap.com',
      password: hashedPassword,
      name: 'Tank Kim',
      title: '시니어 개발자',
      phone: '010-1234-5678',
      role: 'CUSTOMER_ADMIN',
      status: 'ACTIVE',
      language: 'ko',
      tenant_id: bcCardTenant.id,
      org_id: bcCardOrgUnit.id
    },
  });

  console.log('✅ BC카드 tenant created:', bcCardTenant.name);
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