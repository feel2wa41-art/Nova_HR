import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanies() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async createCompany(data: {
    name: string;
    tenant_id: string;
    settings?: any;
  }) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        tenant_id: data.tenant_id,
        settings: data.settings || {},
      }
    });
  }

  async updateCompany(id: string, data: {
    name?: string;
    settings?: any;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.company.update({
      where: { id },
      data
    });
  }

  async deleteCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.company.delete({
      where: { id }
    });
  }

  async getCompanyLocations(companyId: string) {
    return this.prisma.company_location.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' }
    });
  }

  async createCompanyLocation(companyId: string, data: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    radius_m?: number;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.company_location.create({
      data: {
        company_id: companyId,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        radius_m: data.radius_m || 200,
      }
    });
  }

  async updateCompanyLocation(locationId: string, data: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    radius_m?: number;
  }) {
    const location = await this.prisma.company_location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.company_location.update({
      where: { id: locationId },
      data
    });
  }

  async deleteCompanyLocation(locationId: string) {
    const location = await this.prisma.company_location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.prisma.company_location.delete({
      where: { id: locationId }
    });
  }

  async getOrgUnits(companyId: string) {
    return this.prisma.org_unit.findMany({
      where: { company_id: companyId },
      include: {
        parent: true,
        children: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async createOrgUnit(companyId: string, data: {
    name: string;
    parent_id?: string;
    description?: string;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (data.parent_id) {
      const parent = await this.prisma.org_unit.findUnique({
        where: { id: data.parent_id }
      });

      if (!parent || parent.company_id !== companyId) {
        throw new BadRequestException('Invalid parent organization unit');
      }
    }

    return this.prisma.org_unit.create({
      data: {
        company_id: companyId,
        name: data.name,
        parent_id: data.parent_id,
        description: data.description,
      },
      include: {
        parent: true,
        children: true,
      }
    });
  }

  async updateOrgUnit(unitId: string, data: {
    name?: string;
    parent_id?: string;
    description?: string;
  }) {
    const unit = await this.prisma.org_unit.findUnique({
      where: { id: unitId }
    });

    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }

    if (data.parent_id) {
      const parent = await this.prisma.org_unit.findUnique({
        where: { id: data.parent_id }
      });

      if (!parent || parent.company_id !== unit.company_id) {
        throw new BadRequestException('Invalid parent organization unit');
      }

      if (data.parent_id === unitId) {
        throw new BadRequestException('Cannot set unit as its own parent');
      }
    }

    return this.prisma.org_unit.update({
      where: { id: unitId },
      data,
      include: {
        parent: true,
        children: true,
      }
    });
  }

  async deleteOrgUnit(unitId: string) {
    const unit = await this.prisma.org_unit.findUnique({
      where: { id: unitId }
    });

    if (!unit) {
      throw new NotFoundException('Organization unit not found');
    }

    return this.prisma.org_unit.delete({
      where: { id: unitId }
    });
  }
}