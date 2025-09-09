import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCommonCodes() {
  console.log('🌱 Seeding common codes...');

  // Get a test company (you can adjust this to use your actual company ID)
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('No company found. Skipping common code seeding.');
    return;
  }

  // 1. 직급 카테고리 및 코드
  const positionCategory = await prisma.common_code_category.upsert({
    where: {
      company_id_category_code: {
        company_id: company.id,
        category_code: 'POSITION'
      }
    },
    update: {},
    create: {
      company_id: company.id,
      category_code: 'POSITION',
      category_name: '직급',
      description: '회사 직급 관리',
      sort_order: 1
    }
  });

  const positions = [
    { code: 'CEO', name: '대표이사', sort_order: 1 },
    { code: 'CTO', name: '최고기술책임자', sort_order: 2 },
    { code: 'COO', name: '최고운영책임자', sort_order: 3 },
    { code: 'MANAGER', name: '부장', sort_order: 4 },
    { code: 'ASSISTANT_MANAGER', name: '차장', sort_order: 5 },
    { code: 'SUPERVISOR', name: '과장', sort_order: 6 },
    { code: 'SENIOR_STAFF', name: '주임', sort_order: 7 },
    { code: 'STAFF', name: '사원', sort_order: 8 }
  ];

  for (const position of positions) {
    await prisma.common_code.upsert({
      where: {
        category_id_code: {
          category_id: positionCategory.id,
          code: position.code
        }
      },
      update: {},
      create: {
        category_id: positionCategory.id,
        code: position.code,
        name: position.name,
        sort_order: position.sort_order
      }
    });
  }

  // 2. 등급 카테고리 및 코드
  const gradeCategory = await prisma.common_code_category.upsert({
    where: {
      company_id_category_code: {
        company_id: company.id,
        category_code: 'GRADE'
      }
    },
    update: {},
    create: {
      company_id: company.id,
      category_code: 'GRADE',
      category_name: '등급',
      description: '직급별 등급 관리',
      sort_order: 2
    }
  });

  const grades = [
    { code: 'GRADE_A', name: 'A등급', sort_order: 1, extra_data: { color: '#FF6B6B' } },
    { code: 'GRADE_B', name: 'B등급', sort_order: 2, extra_data: { color: '#4ECDC4' } },
    { code: 'GRADE_C', name: 'C등급', sort_order: 3, extra_data: { color: '#45B7D1' } },
    { code: 'GRADE_D', name: 'D등급', sort_order: 4, extra_data: { color: '#96CEB4' } }
  ];

  for (const grade of grades) {
    await prisma.common_code.upsert({
      where: {
        category_id_code: {
          category_id: gradeCategory.id,
          code: grade.code
        }
      },
      update: {},
      create: {
        category_id: gradeCategory.id,
        code: grade.code,
        name: grade.name,
        sort_order: grade.sort_order,
        extra_data: grade.extra_data
      }
    });
  }

  // 3. 부서 카테고리 및 코드
  const departmentCategory = await prisma.common_code_category.upsert({
    where: {
      company_id_category_code: {
        company_id: company.id,
        category_code: 'DEPARTMENT'
      }
    },
    update: {},
    create: {
      company_id: company.id,
      category_code: 'DEPARTMENT',
      category_name: '부서',
      description: '회사 부서 관리',
      sort_order: 3
    }
  });

  const departments = [
    { code: 'MANAGEMENT', name: '경영진', sort_order: 1 },
    { code: 'IT_DEPT', name: 'IT부서', sort_order: 2 },
    { code: 'HR_DEPT', name: '인사부', sort_order: 3 },
    { code: 'FINANCE_DEPT', name: '재무부', sort_order: 4 },
    { code: 'MARKETING_DEPT', name: '마케팅부', sort_order: 5 },
    { code: 'SALES_DEPT', name: '영업부', sort_order: 6 }
  ];

  for (const department of departments) {
    await prisma.common_code.upsert({
      where: {
        category_id_code: {
          category_id: departmentCategory.id,
          code: department.code
        }
      },
      update: {},
      create: {
        category_id: departmentCategory.id,
        code: department.code,
        name: department.name,
        sort_order: department.sort_order
      }
    });
  }

  // 4. 비용 카테고리
  const expenseCategory = await prisma.common_code_category.upsert({
    where: {
      company_id_category_code: {
        company_id: company.id,
        category_code: 'EXPENSE_CATEGORY'
      }
    },
    update: {},
    create: {
      company_id: company.id,
      category_code: 'EXPENSE_CATEGORY',
      category_name: '비용항목',
      description: '전자결재 비용 항목 관리',
      sort_order: 4
    }
  });

  const expenseCategories = [
    { code: 'HOTEL', name: '호텔비', sort_order: 1 },
    { code: 'TRANSPORTATION', name: '교통비', sort_order: 2 },
    { code: 'MEAL', name: '식비', sort_order: 3 },
    { code: 'ENTERTAINMENT', name: '접대비', sort_order: 4 },
    { code: 'TRAINING', name: '교육비', sort_order: 5 },
    { code: 'OFFICE_SUPPLIES', name: '사무용품비', sort_order: 6 },
    { code: 'COMMUNICATION', name: '통신비', sort_order: 7 }
  ];

  for (const expense of expenseCategories) {
    await prisma.common_code.upsert({
      where: {
        category_id_code: {
          category_id: expenseCategory.id,
          code: expense.code
        }
      },
      update: {},
      create: {
        category_id: expenseCategory.id,
        code: expense.code,
        name: expense.name,
        sort_order: expense.sort_order
      }
    });
  }

  // 5. 등급별 비용 한도 설정 예시
  const gradeA = await prisma.common_code.findFirst({
    where: { category_id: gradeCategory.id, code: 'GRADE_A' }
  });
  const gradeB = await prisma.common_code.findFirst({
    where: { category_id: gradeCategory.id, code: 'GRADE_B' }
  });

  if (gradeA && gradeB) {
    // Grade A 호텔비 한도 (1일 5,000,000 IDR)
    const existingGradeAHotel = await prisma.expense_limit.findFirst({
      where: {
        company_id: company.id,
        grade_code_id: gradeA.id,
        position_code_id: null,
        expense_category: 'HOTEL'
      }
    });

    if (!existingGradeAHotel) {
      await prisma.expense_limit.create({
        data: {
          company_id: company.id,
          grade_code_id: gradeA.id,
          expense_category: 'HOTEL',
          daily_limit: 5000000,
          monthly_limit: 50000000,
          currency: 'IDR',
          approval_required: true,
          auto_approval_limit: 3000000
        }
      });
    }

    // Grade B 호텔비 한도 (1일 4,000,000 IDR)
    const existingGradeBHotel = await prisma.expense_limit.findFirst({
      where: {
        company_id: company.id,
        grade_code_id: gradeB.id,
        position_code_id: null,
        expense_category: 'HOTEL'
      }
    });

    if (!existingGradeBHotel) {
      await prisma.expense_limit.create({
        data: {
          company_id: company.id,
          grade_code_id: gradeB.id,
          expense_category: 'HOTEL',
          daily_limit: 4000000,
          monthly_limit: 40000000,
          currency: 'IDR',
          approval_required: true,
          auto_approval_limit: 2500000
        }
      });
    }

    // Grade A 교통비 한도
    const existingGradeATransport = await prisma.expense_limit.findFirst({
      where: {
        company_id: company.id,
        grade_code_id: gradeA.id,
        position_code_id: null,
        expense_category: 'TRANSPORTATION'
      }
    });

    if (!existingGradeATransport) {
      await prisma.expense_limit.create({
        data: {
          company_id: company.id,
          grade_code_id: gradeA.id,
          expense_category: 'TRANSPORTATION',
          daily_limit: 2000000,
          monthly_limit: 20000000,
          currency: 'IDR',
          approval_required: false,
          auto_approval_limit: 1000000
        }
      });
    }
  }

  console.log('✅ Common codes seeded successfully');
}

// 독립적으로 실행 가능하도록
if (require.main === module) {
  seedCommonCodes()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}