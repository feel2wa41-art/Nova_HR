const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nova_hr_dev'
    }
  }
});

async function updateEmailDomains() {
  try {
    console.log('🔄 Starting email domain update...');
    
    // Get all users with nova-hr.com emails
    const usersToUpdate = await prisma.auth_user.findMany({
      where: {
        email: {
          contains: 'nova-hr.com'
        }
      }
    });
    
    console.log(`📧 Found ${usersToUpdate.length} users with nova-hr.com emails`);
    
    // Update each user's email domain
    const updatePromises = usersToUpdate.map(user => {
      const newEmail = user.email.replace('nova-hr.com', 'reko-hr.com');
      console.log(`   ${user.email} → ${newEmail}`);
      
      return prisma.auth_user.update({
        where: {
          id: user.id
        },
        data: {
          email: newEmail
        }
      });
    });
    
    await Promise.all(updatePromises);
    
    console.log('✅ Email domain update completed successfully!');
    
    // Verify the changes
    const verificationUsers = await prisma.auth_user.findMany({
      where: {
        email: {
          contains: 'reko-hr.com'
        }
      },
      select: {
        email: true,
        name: true
      }
    });
    
    console.log('\n📋 Updated users:');
    verificationUsers.forEach(user => {
      console.log(`   ${user.name}: ${user.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating email domains:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEmailDomains();