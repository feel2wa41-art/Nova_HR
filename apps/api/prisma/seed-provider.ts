import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedProvider() {
  console.log('Seeding provider data...');

  try {
    // 1. Check if provider tenant exists
    const existingProvider = await prisma.provider_tenant.findFirst({
      where: { domain: 'provider.nova-hr.com' }
    });

    if (existingProvider) {
      console.log('Provider tenant already exists');
      return existingProvider;
    }

    // 2. Create provider tenant
    const providerTenant = await prisma.provider_tenant.create({
      data: {
        name: 'Reko HR Inc.',
        domain: 'provider.reko-hr.com',
        status: 'ACTIVE'
      }
    });

    console.log('Provider tenant created:', providerTenant.id);

    // 3. Create provider super admin
    const adminPassword = await bcrypt.hash('SuperAdmin@123', 10);
    const providerSuperAdmin = await prisma.provider_admin.create({
      data: {
        email: 'superadmin@reko-hr.com',
        password: adminPassword,
        name: 'Super Administrator',
        phone: '010-1234-5678',
        role: 'PROVIDER_SUPER_ADMIN',
        status: 'ACTIVE',
        tenant_id: providerTenant.id
      }
    });

    console.log('Provider super admin created:', providerSuperAdmin.email);

    // 4. Create regular provider admin
    const regularAdminPassword = await bcrypt.hash('Admin@123', 10);
    const providerAdmin = await prisma.provider_admin.create({
      data: {
        email: 'admin@reko-hr.com',
        password: regularAdminPassword,
        name: 'Provider Administrator',
        phone: '010-2345-6789',
        role: 'PROVIDER_ADMIN',
        status: 'ACTIVE',
        tenant_id: providerTenant.id
      }
    });

    console.log('Provider admin created:', providerAdmin.email);

    // 5. Also create a system super admin user in auth_users table
    // This allows using the regular auth system for provider admins
    const systemSuperAdmin = await prisma.auth_user.findFirst({
      where: { email: 'superadmin@reko-hr.com' }
    });

    if (!systemSuperAdmin) {
      await prisma.auth_user.create({
        data: {
          email: 'superadmin@reko-hr.com',
          password: adminPassword,
          name: 'Super Administrator',
          phone: '010-1234-5678',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          tenant_id: null, // Super admin doesn't belong to specific tenant
          title: 'System Administrator'
        }
      });
      console.log('System super admin user created');
    }

    console.log('\n=== Provider Setup Complete ===');
    console.log('Provider Super Admin:');
    console.log('  Email: superadmin@reko-hr.com');
    console.log('  Password: SuperAdmin@123');
    console.log('');
    console.log('Provider Admin:');
    console.log('  Email: admin@reko-hr.com');
    console.log('  Password: Admin@123');
    console.log('===============================\n');

    return providerTenant;
  } catch (error) {
    console.error('Error seeding provider data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedProvider()
    .then(() => {
      console.log('Provider seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Provider seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedProvider;