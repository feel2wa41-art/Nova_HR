import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProgramCategories() {
  console.log('🌱 Seeding program categories...');

  // Get all companies
  const companies = await prisma.company.findMany();
  if (companies.length === 0) {
    console.log('No companies found. Skipping program category seeding.');
    return;
  }

  const defaultCategories = [
    {
      name: 'Development',
      description: 'Software development and coding activities',
      color: '#3b82f6',
      icon: 'code'
    },
    {
      name: 'Communication',
      description: 'Team communication and collaboration',
      color: '#10b981',
      icon: 'message'
    },
    {
      name: 'Documentation',
      description: 'Writing and maintaining documentation',
      color: '#f59e0b',
      icon: 'file-text'
    },
    {
      name: 'Meetings',
      description: 'Meetings and conferences',
      color: '#8b5cf6',
      icon: 'calendar'
    },
    {
      name: 'Research',
      description: 'Research and learning activities',
      color: '#ef4444',
      icon: 'search'
    },
    {
      name: 'Design',
      description: 'Design and creative work',
      color: '#f97316',
      icon: 'palette'
    },
    {
      name: 'Management',
      description: 'Project and team management',
      color: '#6b7280',
      icon: 'settings'
    },
    {
      name: 'Other',
      description: 'Other miscellaneous activities',
      color: '#374151',
      icon: 'more'
    }
  ];

  // Create categories for each company
  for (const company of companies) {
    console.log(`Creating program categories for company: ${company.name}`);
    
    for (const categoryData of defaultCategories) {
      try {
        // Check if category already exists for this company
        const existingCategory = await prisma.program_category.findFirst({
          where: {
            company_id: company.id,
            name: categoryData.name
          }
        });

        if (!existingCategory) {
          await prisma.program_category.create({
            data: {
              company_id: company.id,
              name: categoryData.name,
              description: categoryData.description,
              color: categoryData.color,
              icon: categoryData.icon,
              is_active: true
            }
          });
          console.log(`  ✅ Created category: ${categoryData.name}`);
        } else {
          console.log(`  ⏭️ Category already exists: ${categoryData.name}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to create category ${categoryData.name}:`, error.message);
      }
    }
  }

  console.log('✅ Program categories seeded successfully');
}

// Allow independent execution
if (require.main === module) {
  seedProgramCategories()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}