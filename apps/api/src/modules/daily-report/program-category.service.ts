import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateProgramCategoryDto, UpdateProgramCategoryDto, CreateProgramMappingDto } from './dto/program-category.dto';

@Injectable()
export class ProgramCategoryService {
  constructor(private prisma: PrismaService) {}

  async createCategory(companyId: string, dto: CreateProgramCategoryDto) {
    // Check if category with same name already exists for this company
    const existingCategory = await this.prisma.program_category.findFirst({
      where: {
        company_id: companyId,
        name: dto.name
      }
    });

    if (existingCategory) {
      throw new ForbiddenException('Category with this name already exists');
    }

    return this.prisma.program_category.create({
      data: {
        company_id: companyId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        is_active: dto.is_active ?? true
      },
      include: {
        program_mappings: {
          where: { is_active: true }
        }
      }
    });
  }

  async updateCategory(companyId: string, categoryId: string, dto: UpdateProgramCategoryDto) {
    const category = await this.prisma.program_category.findFirst({
      where: {
        id: categoryId,
        company_id: companyId
      }
    });

    if (!category) {
      throw new NotFoundException('Program category not found');
    }

    // Check for name conflicts if name is being updated
    if (dto.name && dto.name !== category.name) {
      const existingCategory = await this.prisma.program_category.findFirst({
        where: {
          company_id: companyId,
          name: dto.name,
          id: { not: categoryId }
        }
      });

      if (existingCategory) {
        throw new ForbiddenException('Category with this name already exists');
      }
    }

    return this.prisma.program_category.update({
      where: { id: categoryId },
      data: dto,
      include: {
        program_mappings: {
          where: { is_active: true }
        }
      }
    });
  }

  async deleteCategory(companyId: string, categoryId: string) {
    const category = await this.prisma.program_category.findFirst({
      where: {
        id: categoryId,
        company_id: companyId
      }
    });

    if (!category) {
      throw new NotFoundException('Program category not found');
    }

    // Check if category is being used in any daily reports
    const usageCount = await this.prisma.daily_report_entry.count({
      where: { category_id: categoryId }
    });

    if (usageCount > 0) {
      throw new ForbiddenException('Cannot delete category that is being used in daily reports');
    }

    return this.prisma.program_category.delete({
      where: { id: categoryId }
    });
  }

  async getCategories(companyId: string, includeInactive: boolean = false) {
    const where: any = { company_id: companyId };
    if (!includeInactive) {
      where.is_active = true;
    }

    return this.prisma.program_category.findMany({
      where,
      include: {
        program_mappings: {
          where: { is_active: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getCategoryById(companyId: string, categoryId: string) {
    const category = await this.prisma.program_category.findFirst({
      where: {
        id: categoryId,
        company_id: companyId
      },
      include: {
        program_mappings: {
          where: { is_active: true }
        }
      }
    });

    if (!category) {
      throw new NotFoundException('Program category not found');
    }

    return category;
  }

  // Program mapping methods
  async addProgramMapping(companyId: string, categoryId: string, dto: CreateProgramMappingDto) {
    const category = await this.prisma.program_category.findFirst({
      where: {
        id: categoryId,
        company_id: companyId
      }
    });

    if (!category) {
      throw new NotFoundException('Program category not found');
    }

    // Check if program is already mapped to this category
    const existingMapping = await this.prisma.program_category_mapping.findFirst({
      where: {
        category_id: categoryId,
        program_name: dto.program_name
      }
    });

    if (existingMapping) {
      if (existingMapping.is_active) {
        throw new ForbiddenException('Program is already mapped to this category');
      } else {
        // Reactivate existing mapping
        return this.prisma.program_category_mapping.update({
          where: { id: existingMapping.id },
          data: { is_active: true },
          include: { category: true }
        });
      }
    }

    return this.prisma.program_category_mapping.create({
      data: {
        category_id: categoryId,
        program_name: dto.program_name,
        is_active: true
      },
      include: { category: true }
    });
  }

  async removeProgramMapping(companyId: string, categoryId: string, mappingId: string) {
    const category = await this.prisma.program_category.findFirst({
      where: {
        id: categoryId,
        company_id: companyId
      }
    });

    if (!category) {
      throw new NotFoundException('Program category not found');
    }

    const mapping = await this.prisma.program_category_mapping.findFirst({
      where: {
        id: mappingId,
        category_id: categoryId
      }
    });

    if (!mapping) {
      throw new NotFoundException('Program mapping not found');
    }

    return this.prisma.program_category_mapping.update({
      where: { id: mappingId },
      data: { is_active: false }
    });
  }

  async getAllProgramMappings(companyId: string) {
    return this.prisma.program_category_mapping.findMany({
      where: {
        is_active: true,
        category: {
          company_id: companyId
        }
      },
      include: {
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
        { program_name: 'asc' }
      ]
    });
  }

  async getCategoryByProgramName(companyId: string, programName: string) {
    const mapping = await this.prisma.program_category_mapping.findFirst({
      where: {
        program_name: programName,
        is_active: true,
        category: {
          company_id: companyId,
          is_active: true
        }
      },
      include: {
        category: true
      }
    });

    return mapping?.category || null;
  }

  // Bulk operations for initial setup
  async createDefaultCategories(companyId: string) {
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

    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      try {
        const category = await this.createCategory(companyId, categoryData);
        createdCategories.push(category);
      } catch (error) {
        // Skip if category already exists
        if (error.message.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }

    return createdCategories;
  }
}