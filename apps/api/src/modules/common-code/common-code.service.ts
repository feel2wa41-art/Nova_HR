import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  CreateCommonCodeCategoryDto,
  UpdateCommonCodeCategoryDto,
  CreateCommonCodeDto,
  UpdateCommonCodeDto,
  AssignUserPositionDto,
  AssignUserGradeDto,
  CreateExpenseLimitDto,
  UpdateExpenseLimitDto,
} from './dto/common-code.dto';

@Injectable()
export class CommonCodeService {
  constructor(private prisma: PrismaService) {}

  // ================================
  // Common Code Categories
  // ================================

  async getCategories(companyId: string) {
    return await this.prisma.common_code_category.findMany({
      where: {
        OR: [
          { company_id: companyId },
          { is_system: true, company_id: null }
        ]
      },
      include: {
        codes: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' }
        }
      },
      orderBy: { sort_order: 'asc' }
    });
  }

  async createCategory(companyId: string, dto: CreateCommonCodeCategoryDto) {
    // Check if category code already exists for this company
    const existing = await this.prisma.common_code_category.findFirst({
      where: {
        company_id: companyId,
        category_code: dto.category_code
      }
    });

    if (existing) {
      throw new BadRequestException('Category code already exists for this company');
    }

    return await this.prisma.common_code_category.create({
      data: {
        ...dto,
        company_id: companyId
      },
      include: {
        codes: true
      }
    });
  }

  async updateCategory(categoryId: string, dto: UpdateCommonCodeCategoryDto) {
    const category = await this.prisma.common_code_category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.is_system) {
      throw new BadRequestException('Cannot modify system categories');
    }

    return await this.prisma.common_code_category.update({
      where: { id: categoryId },
      data: dto,
      include: {
        codes: true
      }
    });
  }

  async deleteCategory(categoryId: string) {
    const category = await this.prisma.common_code_category.findUnique({
      where: { id: categoryId },
      include: {
        codes: true
      }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.is_system) {
      throw new BadRequestException('Cannot delete system categories');
    }

    if (category.codes.length > 0) {
      throw new BadRequestException('Cannot delete category with existing codes');
    }

    await this.prisma.common_code_category.delete({
      where: { id: categoryId }
    });

    return { message: 'Category deleted successfully' };
  }

  // ================================
  // Common Codes
  // ================================

  async getCodes(categoryId: string) {
    return await this.prisma.common_code.findMany({
      where: { category_id: categoryId },
      include: {
        parent_code: true,
        child_codes: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' }
        }
      },
      orderBy: { sort_order: 'asc' }
    });
  }

  async getCodesByCategory(companyId: string, categoryCode: string) {
    const category = await this.prisma.common_code_category.findFirst({
      where: {
        category_code: categoryCode,
        OR: [
          { company_id: companyId },
          { is_system: true, company_id: null }
        ]
      }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return await this.getCodes(category.id);
  }

  async createCode(categoryId: string, dto: CreateCommonCodeDto) {
    // Check if code already exists in this category
    const existing = await this.prisma.common_code.findFirst({
      where: {
        category_id: categoryId,
        code: dto.code
      }
    });

    if (existing) {
      throw new BadRequestException('Code already exists in this category');
    }

    // Verify parent code exists if provided
    if (dto.parent_code_id) {
      const parentCode = await this.prisma.common_code.findUnique({
        where: { id: dto.parent_code_id }
      });

      if (!parentCode || parentCode.category_id !== categoryId) {
        throw new BadRequestException('Invalid parent code');
      }
    }

    return await this.prisma.common_code.create({
      data: {
        ...dto,
        category_id: categoryId
      },
      include: {
        parent_code: true,
        child_codes: true
      }
    });
  }

  async updateCode(codeId: string, dto: UpdateCommonCodeDto) {
    const code = await this.prisma.common_code.findUnique({
      where: { id: codeId }
    });

    if (!code) {
      throw new NotFoundException('Code not found');
    }

    // Verify parent code exists if provided
    if (dto.parent_code_id) {
      const parentCode = await this.prisma.common_code.findUnique({
        where: { id: dto.parent_code_id }
      });

      if (!parentCode || parentCode.category_id !== code.category_id) {
        throw new BadRequestException('Invalid parent code');
      }

      // Prevent circular reference
      if (dto.parent_code_id === codeId) {
        throw new BadRequestException('Code cannot be parent of itself');
      }
    }

    return await this.prisma.common_code.update({
      where: { id: codeId },
      data: dto,
      include: {
        parent_code: true,
        child_codes: true
      }
    });
  }

  async deleteCode(codeId: string) {
    const code = await this.prisma.common_code.findUnique({
      where: { id: codeId },
      include: {
        child_codes: true,
        user_positions: true,
        user_grades: true,
        expense_limits: true
      }
    });

    if (!code) {
      throw new NotFoundException('Code not found');
    }

    // Check if code is being used
    if (code.child_codes.length > 0) {
      throw new BadRequestException('Cannot delete code with child codes');
    }

    if (code.user_positions.length > 0 || code.user_grades.length > 0) {
      throw new BadRequestException('Cannot delete code assigned to users');
    }

    if (code.expense_limits.length > 0) {
      throw new BadRequestException('Cannot delete code with expense limits');
    }

    await this.prisma.common_code.delete({
      where: { id: codeId }
    });

    return { message: 'Code deleted successfully' };
  }

  // ================================
  // User Position/Grade Management
  // ================================

  async assignUserPosition(userId: string, dto: AssignUserPositionDto) {
    // Verify position code exists
    const positionCode = await this.prisma.common_code.findUnique({
      where: { id: dto.position_code_id }
    });

    if (!positionCode) {
      throw new NotFoundException('Position code not found');
    }

    // If setting as primary, deactivate other primary positions
    if (dto.is_primary) {
      await this.prisma.user_position.updateMany({
        where: {
          user_id: userId,
          is_primary: true,
          end_date: null
        },
        data: { is_primary: false }
      });
    }

    return await this.prisma.user_position.create({
      data: {
        ...dto,
        user_id: userId,
        effective_date: dto.effective_date || new Date()
      },
      include: {
        position_code: {
          include: {
            category: true
          }
        }
      }
    });
  }

  async assignUserGrade(userId: string, dto: AssignUserGradeDto) {
    // Verify grade code exists
    const gradeCode = await this.prisma.common_code.findUnique({
      where: { id: dto.grade_code_id }
    });

    if (!gradeCode) {
      throw new NotFoundException('Grade code not found');
    }

    // If setting as primary, deactivate other primary grades
    if (dto.is_primary) {
      await this.prisma.user_grade.updateMany({
        where: {
          user_id: userId,
          is_primary: true,
          end_date: null
        },
        data: { is_primary: false }
      });
    }

    return await this.prisma.user_grade.create({
      data: {
        ...dto,
        user_id: userId,
        effective_date: dto.effective_date || new Date()
      },
      include: {
        grade_code: {
          include: {
            category: true
          }
        }
      }
    });
  }

  async getUserPositions(userId: string) {
    return await this.prisma.user_position.findMany({
      where: {
        user_id: userId,
        end_date: null
      },
      include: {
        position_code: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { is_primary: 'desc' },
        { effective_date: 'desc' }
      ]
    });
  }

  async getUserGrades(userId: string) {
    return await this.prisma.user_grade.findMany({
      where: {
        user_id: userId,
        end_date: null
      },
      include: {
        grade_code: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { is_primary: 'desc' },
        { effective_date: 'desc' }
      ]
    });
  }

  // ================================
  // Expense Limits Management
  // ================================

  async getExpenseLimits(companyId: string) {
    return await this.prisma.expense_limit.findMany({
      where: { company_id: companyId },
      include: {
        grade_code: {
          include: {
            category: true
          }
        }
      },
      orderBy: { expense_category: 'asc' }
    });
  }

  async createExpenseLimit(companyId: string, dto: CreateExpenseLimitDto) {
    // Validate that either grade_code_id or position_code_id is provided, but not both
    if (!dto.grade_code_id && !dto.position_code_id) {
      throw new BadRequestException('Either grade_code_id or position_code_id must be provided');
    }

    if (dto.grade_code_id && dto.position_code_id) {
      throw new BadRequestException('Cannot set both grade_code_id and position_code_id');
    }

    // Check for duplicate
    const existing = await this.prisma.expense_limit.findFirst({
      where: {
        company_id: companyId,
        grade_code_id: dto.grade_code_id || null,
        position_code_id: dto.position_code_id || null,
        expense_category: dto.expense_category
      }
    });

    if (existing) {
      throw new BadRequestException('Expense limit already exists for this combination');
    }

    return await this.prisma.expense_limit.create({
      data: {
        ...dto,
        company_id: companyId
      },
      include: {
        grade_code: {
          include: {
            category: true
          }
        }
      }
    });
  }

  async updateExpenseLimit(limitId: string, dto: UpdateExpenseLimitDto) {
    const limit = await this.prisma.expense_limit.findUnique({
      where: { id: limitId }
    });

    if (!limit) {
      throw new NotFoundException('Expense limit not found');
    }

    return await this.prisma.expense_limit.update({
      where: { id: limitId },
      data: dto,
      include: {
        grade_code: {
          include: {
            category: true
          }
        }
      }
    });
  }

  async deleteExpenseLimit(limitId: string) {
    const limit = await this.prisma.expense_limit.findUnique({
      where: { id: limitId }
    });

    if (!limit) {
      throw new NotFoundException('Expense limit not found');
    }

    await this.prisma.expense_limit.delete({
      where: { id: limitId }
    });

    return { message: 'Expense limit deleted successfully' };
  }

  async getUserExpenseLimits(userId: string, expenseCategory?: string) {
    // Get user's current grade and position
    const [userGrades, userPositions] = await Promise.all([
      this.getUserGrades(userId),
      this.getUserPositions(userId)
    ]);

    const primaryGrade = userGrades.find(g => g.is_primary);
    const primaryPosition = userPositions.find(p => p.is_primary);

    if (!primaryGrade && !primaryPosition) {
      return [];
    }

    const where: any = {
      OR: []
    };

    if (primaryGrade) {
      where.OR.push({ grade_code_id: primaryGrade.grade_code_id });
    }

    if (primaryPosition) {
      where.OR.push({ position_code_id: primaryPosition.position_code_id });
    }

    if (expenseCategory) {
      where.expense_category = expenseCategory;
    }

    where.is_active = true;

    return await this.prisma.expense_limit.findMany({
      where,
      include: {
        grade_code: true
      }
    });
  }
}