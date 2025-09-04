import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface UserRequestEmailData {
  userName: string;
  userEmail: string;
  companyName: string;
  phone?: string;
  message?: string;
  requestedAt: Date;
}

export interface ApprovalRequestEmailData {
  requestorName: string;
  approverName: string;
  documentTitle: string;
  documentType: string;
  requestedAt: Date;
  approvalUrl: string;
}

export interface ApprovalCompletionEmailData {
  requestorName: string;
  approverName: string;
  documentTitle: string;
  documentType: string;
  status: 'APPROVED' | 'REJECTED';
  completedAt: Date;
  comments?: string;
}

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;
  private readonly providerEmail: string;

  constructor(private configService: ConfigService) {
    const awsConfig = {
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId'),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
      },
    };

    this.sesClient = new SESClient(awsConfig);
    this.fromEmail = this.configService.get<string>('aws.ses.fromEmail');
    this.providerEmail = this.configService.get<string>('aws.ses.providerEmail');
  }

  private async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text: string
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];

    try {
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: recipients,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await this.sesClient.send(command);
      this.logger.log(`Email sent successfully to ${recipients.join(', ')}: ${result.MessageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipients.join(', ')}:`, error);
      throw error;
    }
  }

  // 홈페이지 사용자 요청 이메일
  async sendUserRequestEmail(data: UserRequestEmailData): Promise<void> {
    const subject = `Nova HR 서비스 이용 요청 - ${data.companyName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Nova HR 서비스 이용 요청</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">새로운 서비스 이용 요청이 접수되었습니다</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">요청자 정보</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>회사명:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>담당자명:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.userName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>이메일:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.userEmail}</td>
              </tr>
              ${data.phone ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>연락처:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0;"><strong>요청일시:</strong></td>
                <td style="padding: 10px 0;">${data.requestedAt.toLocaleString('ko-KR')}</td>
              </tr>
            </table>
          </div>
          
          ${data.message ? `
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">요청 메시지</h3>
            <p style="line-height: 1.6; color: #374151;">${data.message}</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding: 20px; background-color: #dbeafe; border-radius: 8px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>다음 단계:</strong> 담당자가 요청을 검토한 후 24시간 내에 연락드리겠습니다.
            </p>
          </div>
        </div>
        
        <div style="background-color: #374151; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">© 2024 Nova HR. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
Nova HR 서비스 이용 요청

요청자 정보:
- 회사명: ${data.companyName}
- 담당자명: ${data.userName}
- 이메일: ${data.userEmail}
${data.phone ? `- 연락처: ${data.phone}\n` : ''}
- 요청일시: ${data.requestedAt.toLocaleString('ko-KR')}

${data.message ? `요청 메시지:\n${data.message}\n\n` : ''}
담당자가 요청을 검토한 후 24시간 내에 연락드리겠습니다.
    `;

    await this.sendEmail(this.providerEmail, subject, html, text);
  }

  // 결재 승인 요청 이메일
  async sendApprovalRequestEmail(
    approverEmail: string,
    data: ApprovalRequestEmailData
  ): Promise<void> {
    const subject = `[Nova HR] 전자결재 승인 요청 - ${data.documentTitle}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #059669; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">전자결재 승인 요청</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">안녕하세요, ${data.approverName}님</h2>
          <p style="color: #374151; line-height: 1.6;">새로운 결재 문서의 승인을 요청드립니다.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #059669; margin-top: 0;">문서 정보</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>문서 제목:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.documentTitle}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>문서 유형:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.documentType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>신청자:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.requestorName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0;"><strong>요청일시:</strong></td>
                <td style="padding: 10px 0;">${data.requestedAt.toLocaleString('ko-KR')}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.approvalUrl}" 
               style="display: inline-block; background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              승인 처리하기
            </a>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>알림:</strong> 결재 처리는 로그인 후 Nova HR 시스템에서 진행해주세요.
            </p>
          </div>
        </div>
        
        <div style="background-color: #374151; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">© 2024 Nova HR. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
전자결재 승인 요청

안녕하세요, ${data.approverName}님

새로운 결재 문서의 승인을 요청드립니다.

문서 정보:
- 문서 제목: ${data.documentTitle}
- 문서 유형: ${data.documentType}
- 신청자: ${data.requestorName}
- 요청일시: ${data.requestedAt.toLocaleString('ko-KR')}

승인 처리: ${data.approvalUrl}

결재 처리는 로그인 후 Nova HR 시스템에서 진행해주세요.
    `;

    await this.sendEmail(approverEmail, subject, html, text);
  }

  // 결재 완료 알림 이메일
  async sendApprovalCompletionEmail(
    requestorEmail: string,
    data: ApprovalCompletionEmailData
  ): Promise<void> {
    const isApproved = data.status === 'APPROVED';
    const statusText = isApproved ? '승인' : '반려';
    const statusColor = isApproved ? '#059669' : '#dc2626';
    
    const subject = `[Nova HR] 전자결재 ${statusText} - ${data.documentTitle}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">전자결재 ${statusText} 완료</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">안녕하세요, ${data.requestorName}님</h2>
          <p style="color: #374151; line-height: 1.6;">
            요청하신 전자결재가 <strong style="color: ${statusColor};">${statusText}</strong>되었습니다.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
            <h3 style="color: ${statusColor}; margin-top: 0;">결재 결과</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>문서 제목:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.documentTitle}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>문서 유형:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.documentType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>승인자:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${data.approverName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>처리 상태:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: ${statusColor}; font-weight: bold;">${statusText}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0;"><strong>처리일시:</strong></td>
                <td style="padding: 10px 0;">${data.completedAt.toLocaleString('ko-KR')}</td>
              </tr>
            </table>
          </div>
          
          ${data.comments ? `
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">승인자 의견</h3>
            <p style="line-height: 1.6; color: #374151; font-style: italic;">"${data.comments}"</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e0f2fe; border-radius: 6px; border-left: 4px solid #0288d1;">
            <p style="margin: 0; color: #01579b;">
              <strong>안내:</strong> 자세한 내용은 Nova HR 시스템에서 확인하실 수 있습니다.
            </p>
          </div>
        </div>
        
        <div style="background-color: #374151; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">© 2024 Nova HR. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
전자결재 ${statusText} 완료

안녕하세요, ${data.requestorName}님

요청하신 전자결재가 ${statusText}되었습니다.

결재 결과:
- 문서 제목: ${data.documentTitle}
- 문서 유형: ${data.documentType}
- 승인자: ${data.approverName}
- 처리 상태: ${statusText}
- 처리일시: ${data.completedAt.toLocaleString('ko-KR')}

${data.comments ? `승인자 의견: "${data.comments}"\n\n` : ''}
자세한 내용은 Nova HR 시스템에서 확인하실 수 있습니다.
    `;

    await this.sendEmail(requestorEmail, subject, html, text);
  }

  // 비밀번호 초기화 이메일
  async sendPasswordResetEmail(
    userEmail: string,
    data: PasswordResetEmailData
  ): Promise<void> {
    const subject = '[Nova HR] 비밀번호 초기화 요청';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">비밀번호 초기화</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937;">안녕하세요, ${data.userName}님</h2>
          <p style="color: #374151; line-height: 1.6;">Nova HR 계정의 비밀번호 초기화 요청을 받았습니다.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              아래 버튼을 클릭하여 새로운 비밀번호를 설정해주세요. 이 링크는 
              <strong style="color: #3b82f6;">${data.expiresAt.toLocaleString('ko-KR')}</strong>까지 유효합니다.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              비밀번호 재설정하기
            </a>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">보안 안내</h3>
            <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
              <li>비밀번호 초기화를 요청하지 않았다면 이 이메일을 무시하세요.</li>
              <li>링크를 클릭하지 않으면 비밀번호는 변경되지 않습니다.</li>
              <li>새 비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해주세요.</li>
            </ul>
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #e0f2fe; border-radius: 6px; border-left: 4px solid #0288d1;">
            <p style="margin: 0; color: #01579b; font-size: 14px;">
              문제가 있거나 도움이 필요하시면 고객지원팀(support@reko-hr.com)으로 연락해주세요.
            </p>
          </div>
        </div>
        
        <div style="background-color: #374151; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">© 2024 Nova HR. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
비밀번호 초기화

안녕하세요, ${data.userName}님

Nova HR 계정의 비밀번호 초기화 요청을 받았습니다.

다음 링크를 클릭하여 새로운 비밀번호를 설정해주세요:
${data.resetUrl}

이 링크는 ${data.expiresAt.toLocaleString('ko-KR')}까지 유효합니다.

보안 안내:
- 비밀번호 초기화를 요청하지 않았다면 이 이메일을 무시하세요.
- 링크를 클릭하지 않으면 비밀번호는 변경되지 않습니다.
- 새 비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해주세요.

문제가 있거나 도움이 필요하시면 고객지원팀(support@reko-hr.com)으로 연락해주세요.
    `;

    await this.sendEmail(userEmail, subject, html, text);
  }
}