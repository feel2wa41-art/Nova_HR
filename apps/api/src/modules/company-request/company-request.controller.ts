import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiQuery 
} from '@nestjs/swagger';
import { CompanyRequestService } from './company-request.service';
import { 
  CreateCompanyRequestDto, 
  ApproveCompanyRequestDto, 
  RejectCompanyRequestDto,
  CompanyRequestQueryDto,
  CompanyRequestStatus 
} from './dto/company-request.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

@ApiTags('Company Requests')
@Controller('company-requests')
export class CompanyRequestController {
  constructor(private readonly companyRequestService: CompanyRequestService) {}

  // Public endpoint - No authentication required
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit company registration request' })
  @ApiResponse({ 
    status: 201, 
    description: 'Request submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        request_id: { type: 'string' },
        status: { type: 'string' }
      }
    }
  })
  async createRequest(@Body(ValidationPipe) dto: CreateCompanyRequestDto) {
    return this.companyRequestService.createRequest(dto);
  }

  // Provider admin endpoints
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROVIDER_ADMIN', 'PROVIDER_SUPER_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all company requests' })
  @ApiQuery({ name: 'status', enum: CompanyRequestStatus, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getRequests(
    @Query(ValidationPipe) query: CompanyRequestQueryDto,
    @Request() req
  ) {
    const providerId = req.user.id;
    return this.companyRequestService.getRequests(query, providerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROVIDER_ADMIN', 'PROVIDER_SUPER_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get company request by ID' })
  async getRequestById(@Param('id') id: string, @Request() req) {
    const providerId = req.user.id;
    return this.companyRequestService.getRequestById(id, providerId);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROVIDER_ADMIN', 'PROVIDER_SUPER_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approve company registration request' })
  @ApiResponse({ 
    status: 200, 
    description: 'Request approved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tenant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            domain: { type: 'string' }
          }
        },
        adminUser: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            tempPassword: { type: 'string' }
          }
        }
      }
    }
  })
  async approveRequest(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: ApproveCompanyRequestDto,
    @Request() req
  ) {
    const providerId = req.user.id;
    return this.companyRequestService.approveRequest(id, dto, providerId);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROVIDER_ADMIN', 'PROVIDER_SUPER_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reject company registration request' })
  async rejectRequest(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: RejectCompanyRequestDto,
    @Request() req
  ) {
    const providerId = req.user.id;
    return this.companyRequestService.rejectRequest(id, dto, providerId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROVIDER_ADMIN', 'PROVIDER_SUPER_ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update request status (e.g., mark as reviewing)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: CompanyRequestStatus },
    @Request() req
  ) {
    const providerId = req.user.id;
    return this.companyRequestService.updateRequestStatus(id, body.status, providerId);
  }
}

// Public auth controller endpoint
@ApiTags('Auth')
@Controller('auth')
export class CompanyRequestAuthController {
  constructor(private readonly companyRequestService: CompanyRequestService) {}

  // This endpoint matches the frontend expectation
  @Post('request-company')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit company registration request (public)' })
  async requestCompany(@Body(ValidationPipe) dto: CreateCompanyRequestDto) {
    return this.companyRequestService.createRequest(dto);
  }
}