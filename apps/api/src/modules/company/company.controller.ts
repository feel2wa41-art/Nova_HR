import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete,
  Param, 
  Body, 
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  async getCompanies(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.companyService.getCompanies(tenantId);
  }

  @Get('my-company')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN', 'EMPLOYEE')
  @ApiOperation({ summary: 'Get current user company info' })
  async getMyCompany(@Request() req) {
    const tenantId = req.user.tenantId;
    const companies = await this.companyService.getCompanies(tenantId);
    if (companies.length === 0) {
      throw new NotFoundException('Company not found');
    }
    return companies[0]; // Return first company for this tenant
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get company by ID' })
  async getCompany(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.companyService.getCompany(id, tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'PROVIDER_ADMIN')
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
      biz_no?: string;
      ceo_name?: string;
      phone?: string;
      email?: string;
      address?: string;
      logo_url?: string;
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

  @Post(':id/logo')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Upload company logo' })
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: './uploads/company-logos',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
  }))
  async uploadCompanyLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const logoUrl = `/uploads/company-logos/${file.filename}`;
    return this.companyService.updateCompany(id, { logo_url: logoUrl });
  }

  @Delete(':id/logo')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete company logo' })
  async deleteCompanyLogo(@Param('id') id: string) {
    return this.companyService.updateCompany(id, { logo_url: null });
  }
}