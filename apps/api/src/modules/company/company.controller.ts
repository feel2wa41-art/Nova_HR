import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete,
  Param, 
  Body, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Company')
@Controller('company')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all companies' })
  async getCompanies() {
    return this.companyService.getCompanies();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get company by ID' })
  async getCompany(@Param('id') id: string) {
    return this.companyService.getCompany(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new company' })
  async createCompany(@Body() body: {
    name: string;
    tenant_id: string;
    settings?: any;
  }) {
    return this.companyService.createCompany(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update company' })
  async updateCompany(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      settings?: any;
    }
  ) {
    return this.companyService.updateCompany(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete company' })
  async deleteCompany(@Param('id') id: string) {
    return this.companyService.deleteCompany(id);
  }

  @Get(':id/locations')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get company locations' })
  async getCompanyLocations(@Param('id') id: string) {
    return this.companyService.getCompanyLocations(id);
  }

  @Post(':id/locations')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create company location' })
  async createCompanyLocation(
    @Param('id') id: string,
    @Body() body: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      radius_m?: number;
    }
  ) {
    return this.companyService.createCompanyLocation(id, body);
  }

  @Patch('locations/:locationId')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update company location' })
  async updateCompanyLocation(
    @Param('locationId') locationId: string,
    @Body() body: {
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
      radius_m?: number;
    }
  ) {
    return this.companyService.updateCompanyLocation(locationId, body);
  }

  @Delete('locations/:locationId')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete company location' })
  async deleteCompanyLocation(@Param('locationId') locationId: string) {
    return this.companyService.deleteCompanyLocation(locationId);
  }

  @Get(':id/org-units')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get organization units' })
  async getOrgUnits(@Param('id') id: string) {
    return this.companyService.getOrgUnits(id);
  }

  @Post(':id/org-units')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create organization unit' })
  async createOrgUnit(
    @Param('id') id: string,
    @Body() body: {
      name: string;
      parent_id?: string;
      description?: string;
    }
  ) {
    return this.companyService.createOrgUnit(id, body);
  }

  @Patch('org-units/:unitId')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update organization unit' })
  async updateOrgUnit(
    @Param('unitId') unitId: string,
    @Body() body: {
      name?: string;
      parent_id?: string;
      description?: string;
    }
  ) {
    return this.companyService.updateOrgUnit(unitId, body);
  }

  @Delete('org-units/:unitId')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete organization unit' })
  async deleteOrgUnit(@Param('unitId') unitId: string) {
    return this.companyService.deleteOrgUnit(unitId);
  }
}