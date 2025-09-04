import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException 
} from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { EmailService } from '../email/email.service';
import { 
  CreateCompanyRequestDto, 
  ApproveCompanyRequestDto, 
  RejectCompanyRequestDto,
  CompanyRequestQueryDto,
  CompanyRequestStatus 
} from './dto/company-request.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompanyRequestService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  // Public endpoint - Create company registration request
  async createRequest(dto: CreateCompanyRequestDto) {
    try {
      // Check if email already has a pending request
      const existingRequest = await this.prisma.company_request.findFirst({
        where: {
          contact_email: dto.contact_email,
          status: { in: ['PENDING', 'REVIEWING'] }
        }
      });

      if (existingRequest) {
        throw new ConflictException('A request with this email is already pending');
      }

      // Check if company with this email already exists
      const existingCompany = await this.prisma.company.findFirst({
        where: { email: dto.contact_email }
      });

      if (existingCompany) {
        throw new ConflictException('A company with this email already exists');
      }

      // Create the request
      const request = await this.prisma.company_request.create({
        data: {
          company_name: dto.company_name,
          business_number: dto.business_number,
          ceo_name: dto.ceo_name,
          contact_email: dto.contact_email,
          contact_phone: dto.contact_phone,
          address: dto.address,
          employee_count: dto.employee_count,
          industry: dto.industry,
          description: dto.description,
          notes: dto.notes,
          status: CompanyRequestStatus.PENDING
        }
      });

      // Send email notification to provider
      try {
        await this.emailService.sendUserRequestEmail({
          userName: dto.ceo_name,
          userEmail: dto.contact_email,
          companyName: dto.company_name,
          phone: dto.contact_phone,
          message: dto.description,
          requestedAt: new Date()
        });
      } catch (emailError) {
        // Log email error but don't fail the request creation
        console.error('Failed to send notification email:', emailError);
      }

      return {
        message: 'Company registration request submitted successfully',
        request_id: request.id,
        status: request.status
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to submit registration request');
    }
  }

  // Provider admin endpoints
  async getRequests(query: CompanyRequestQueryDto, providerId: string) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { company_name: { contains: query.search, mode: 'insensitive' } },
        { contact_email: { contains: query.search, mode: 'insensitive' } },
        { ceo_name: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [requests, total] = await Promise.all([
      this.prisma.company_request.findMany({
        where,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.company_request.count({ where })
    ]);

    return {
      data: requests,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  async getRequestById(id: string, providerId: string) {
    const request = await this.prisma.company_request.findUnique({
      where: { id },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tenant: true
      }
    });

    if (!request) {
      throw new NotFoundException('Company request not found');
    }

    return request;
  }

  async approveRequest(id: string, dto: ApproveCompanyRequestDto, providerId: string) {
    const request = await this.prisma.company_request.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundException('Company request not found');
    }

    if (request.status !== CompanyRequestStatus.PENDING && 
        request.status !== CompanyRequestStatus.REVIEWING) {
      throw new BadRequestException('This request has already been processed');
    }

    // Check if user is a provider_admin or a super_admin
    const providerAdmin = await this.prisma.provider_admin.findUnique({
      where: { id: providerId }
    });

    // Begin transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: request.company_name,
          domain: this.generateDomain(request.company_name),
          status: 'ACTIVE',
          plan: dto.plan || 'BASIC',
          max_users: dto.max_users || 50,
          settings: {}
        }
      });

      // 2. Create company
      const company = await tx.company.create({
        data: {
          tenant_id: tenant.id,
          name: request.company_name,
          biz_no: request.business_number,
          ceo_name: request.ceo_name,
          phone: request.contact_phone,
          email: request.contact_email,
          address: request.address,
          timezone: 'Asia/Seoul',
          currency: 'KRW',
          settings: {}
        }
      });

      // 3. Generate temporary password
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // 4. Create admin user
      const adminUser = await tx.auth_user.create({
        data: {
          email: request.contact_email,
          password: hashedPassword,
          name: request.ceo_name,
          phone: request.contact_phone,
          role: 'CUSTOMER_ADMIN',
          tenant_id: tenant.id,
          org_id: null, // Will be set when org_unit is created
          status: 'ACTIVE',
          title: 'Administrator'
        }
      });

      // 5. Create default organization unit
      const orgUnit = await tx.org_unit.create({
        data: {
          company_id: company.id,
          name: 'Headquarters',
          code: 'HQ',
          parent_id: null
        }
      });

      // 6. Update admin user with org_id
      await tx.auth_user.update({
        where: { id: adminUser.id },
        data: { org_id: orgUnit.id }
      });

      // 7. Create default location
      await tx.company_location.create({
        data: {
          company_id: company.id,
          name: 'Main Office',
          code: 'MAIN',
          address: request.address || 'To be updated',
          lat: 37.5665, // Default to Seoul coordinates
          lng: 126.9780,
          radius_m: 200,
          wifi_ssids: [],
          ip_cidrs: [],
          web_checkin_allowed: true,
          face_required: false,
          status: 'ACTIVE'
        }
      });

      // 8. Update company request
      const updatedRequest = await tx.company_request.update({
        where: { id },
        data: {
          status: CompanyRequestStatus.APPROVED,
          reviewed_by: providerAdmin?.id || null, // Set to null for SUPER_ADMIN
          reviewed_at: new Date(),
          tenant_id: tenant.id,
          company_id: company.id,
          admin_user_id: adminUser.id
        }
      });

      return {
        request: updatedRequest,
        tenant,
        company,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          tempPassword
        }
      };
    });

    // TODO: Send email with login credentials
    console.log('Temporary password for', result.adminUser.email, ':', result.adminUser.tempPassword);

    return {
      message: 'Company request approved successfully',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        domain: result.tenant.domain
      },
      adminUser: {
        email: result.adminUser.email,
        // In production, don't return password in response
        tempPassword: result.adminUser.tempPassword
      }
    };
  }

  async rejectRequest(id: string, dto: RejectCompanyRequestDto, providerId: string) {
    const request = await this.prisma.company_request.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundException('Company request not found');
    }

    if (request.status !== CompanyRequestStatus.PENDING && 
        request.status !== CompanyRequestStatus.REVIEWING) {
      throw new BadRequestException('This request has already been processed');
    }

    const updatedRequest = await this.prisma.company_request.update({
      where: { id },
      data: {
        status: CompanyRequestStatus.REJECTED,
        reviewed_by: providerId,
        reviewed_at: new Date(),
        rejection_reason: dto.rejection_reason,
        notes: dto.notes
      }
    });

    // TODO: Send rejection email
    console.log('Request rejected:', updatedRequest.contact_email);

    return {
      message: 'Company request rejected',
      request_id: updatedRequest.id,
      status: updatedRequest.status
    };
  }

  async updateRequestStatus(id: string, status: CompanyRequestStatus, providerId: string) {
    const request = await this.prisma.company_request.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundException('Company request not found');
    }

    const updatedRequest = await this.prisma.company_request.update({
      where: { id },
      data: {
        status,
        reviewed_by: providerId,
        updated_at: new Date()
      }
    });

    return updatedRequest;
  }

  // Helper methods
  private generateDomain(companyName: string): string {
    const cleanName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${cleanName}-${randomSuffix}.reko-hr.com`;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}