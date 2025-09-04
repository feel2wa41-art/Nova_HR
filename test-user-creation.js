const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const bcrypt = require('./apps/api/node_modules/bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔍 Looking for existing user...');
    
    // Check if user already exists
    let user = await prisma.auth_user.findUnique({
      where: { email: 'tank.kim@bccard-ap.com' }
    });

    if (user) {
      console.log('👤 User already exists, updating...');
      
      // Update existing user
      user = await prisma.auth_user.update({
        where: { email: 'tank.kim@bccard-ap.com' },
        data: {
          name: 'kim sangil(tank)',
          role: 'HR_MANAGER',
          is_active: true,
          is_approved: true,
          approved_at: new Date(),
        }
      });
    } else {
      console.log('➕ Creating new user...');
      
      // Get the first company (should be BCCAP or create it)
      let company = await prisma.company.findFirst({
        where: { name: { contains: 'bccap', mode: 'insensitive' } }
      });

      if (!company) {
        // Create BCCAP company
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
          throw new Error('No tenant found. Please run seed first.');
        }

        company = await prisma.company.create({
          data: {
            name: 'BCCAP',
            tenant_id: tenant.id,
            domain: 'bccard-ap.com',
            settings: {
              work_policy: {
                default_work_hours: 8,
                lunch_break_minutes: 60,
                work_start_time: '09:00',
                work_end_time: '18:00',
                geofence_radius: 200,
                allow_overtime: true,
                require_approval_for_overtime: true
              }
            }
          }
        });

        // Create default location for the company
        await prisma.company_location.create({
          data: {
            name: '본사',
            company_id: company.id,
            address: '서울특별시',
            latitude: 37.5665,
            longitude: 126.9780,
            radius: 200,
            is_primary: true
          }
        });

        console.log('✅ Created BCCAP company');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Create user
      user = await prisma.auth_user.create({
        data: {
          email: 'tank.kim@bccard-ap.com',
          name: 'kim sangil(tank)',
          password: hashedPassword,
          role: 'HR_MANAGER',
          is_active: true,
          is_approved: true,
          approved_at: new Date(),
          company_id: company.id
        }
      });
    }

    console.log('✅ Test user created/updated successfully!');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('🏢 Role:', user.role);
    console.log('✅ Active:', user.is_active);
    console.log('✅ Approved:', user.is_approved);
    console.log('🔑 Password: admin123');

    console.log('\n🎯 Now you can login with:');
    console.log('Email: tank.kim@bccard-ap.com');
    console.log('Password: admin123');
    console.log('Role: HR Manager');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();