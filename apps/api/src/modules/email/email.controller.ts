import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test/user-request')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'PROVIDER_ADMIN')
  @ApiOperation({ summary: 'Test user request email (Admin only)' })
  async testUserRequestEmail(
    @Body() body: {
      userName: string;
      userEmail: string;
      companyName: string;
      phone?: string;
      message?: string;
    }
  ) {
    await this.emailService.sendUserRequestEmail({
      userName: body.userName,
      userEmail: body.userEmail,
      companyName: body.companyName,
      phone: body.phone,
      message: body.message,
      requestedAt: new Date()
    });

    return { message: 'Test user request email sent successfully' };
  }

  @Post('test/approval-request')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'PROVIDER_ADMIN')
  @ApiOperation({ summary: 'Test approval request email (Admin only)' })
  async testApprovalRequestEmail(
    @Body() body: {
      approverEmail: string;
      requestorName: string;
      approverName: string;
      documentTitle: string;
      documentType: string;
    }
  ) {
    await this.emailService.sendApprovalRequestEmail(
      body.approverEmail,
      {
        requestorName: body.requestorName,
        approverName: body.approverName,
        documentTitle: body.documentTitle,
        documentType: body.documentType,
        requestedAt: new Date(),
        approvalUrl: 'http://localhost:3001/approval/inbox/test-123'
      }
    );

    return { message: 'Test approval request email sent successfully' };
  }

  @Post('test/approval-completion')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'PROVIDER_ADMIN')
  @ApiOperation({ summary: 'Test approval completion email (Admin only)' })
  async testApprovalCompletionEmail(
    @Body() body: {
      requestorEmail: string;
      requestorName: string;
      approverName: string;
      documentTitle: string;
      documentType: string;
      status: 'APPROVED' | 'REJECTED';
      comments?: string;
    }
  ) {
    await this.emailService.sendApprovalCompletionEmail(
      body.requestorEmail,
      {
        requestorName: body.requestorName,
        approverName: body.approverName,
        documentTitle: body.documentTitle,
        documentType: body.documentType,
        status: body.status,
        completedAt: new Date(),
        comments: body.comments
      }
    );

    return { message: 'Test approval completion email sent successfully' };
  }

  @Post('test/password-reset')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'PROVIDER_ADMIN')
  @ApiOperation({ summary: 'Test password reset email (Admin only)' })
  async testPasswordResetEmail(
    @Body() body: {
      userEmail: string;
      userName: string;
      token: string;
    }
  ) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/reset-password?token=${body.token}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await this.emailService.sendPasswordResetEmail(body.userEmail, {
      userName: body.userName,
      resetUrl,
      expiresAt
    });

    return { message: 'Test password reset email sent successfully' };
  }
}