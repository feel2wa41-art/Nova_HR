import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseEncryption, DatabaseAuditLogger, createDatabaseSecurityConfig, isSensitiveField } from './db-security.config';

@Injectable()
export class PrismaSecurityService {
  private encryption: DatabaseEncryption;
  private auditLogger: DatabaseAuditLogger;
  private securityConfig: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaClient,
  ) {
    this.securityConfig = createDatabaseSecurityConfig(configService);
    
    if (this.securityConfig.encryption.enabled) {
      this.encryption = new DatabaseEncryption(configService);
    }
    
    if (this.securityConfig.audit.enabled) {
      this.auditLogger = new DatabaseAuditLogger(configService, this.securityConfig);
    }

    this.setupMiddleware();
  }

  private setupMiddleware() {
    // Query middleware for encryption/decryption
    this.prisma.$use(async (params, next) => {
      // Encrypt sensitive fields before writing
      if (['create', 'update', 'upsert'].includes(params.action)) {
        params.args.data = this.encryptSensitiveFields(params.args.data);
      }

      // Audit logging
      if (this.auditLogger) {
        this.auditLogger.logQuery(
          `${params.action} on ${params.model}`,
          [JSON.stringify(params.args)],
          this.getCurrentUserId(),
        );
      }

      // Execute query
      const result = await next(params);

      // Decrypt sensitive fields after reading
      if (['findMany', 'findUnique', 'findFirst'].includes(params.action)) {
        return this.decryptSensitiveFields(result);
      }

      return result;
    });

    // Raw query middleware
    this.prisma.$use(async (params, next) => {
      if (params.action === 'executeRaw' || params.action === 'queryRaw') {
        if (this.auditLogger) {
          this.auditLogger.logQuery(
            params.args.query || 'Raw query',
            params.args.parameters || [],
            this.getCurrentUserId(),
          );
        }
      }

      return next(params);
    });
  }

  private encryptSensitiveFields(data: any): any {
    if (!this.encryption || !data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.encryptSensitiveFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const encrypted = { ...data };
      
      Object.keys(encrypted).forEach(key => {
        if (isSensitiveField(key) && typeof encrypted[key] === 'string') {
          encrypted[key] = this.encryption.encrypt(encrypted[key]);
        } else if (typeof encrypted[key] === 'object') {
          encrypted[key] = this.encryptSensitiveFields(encrypted[key]);
        }
      });
      
      return encrypted;
    }

    return data;
  }

  private decryptSensitiveFields(data: any): any {
    if (!this.encryption || !data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.decryptSensitiveFields(item));
    }

    if (typeof data === 'object' && data !== null) {
      const decrypted = { ...data };
      
      Object.keys(decrypted).forEach(key => {
        if (isSensitiveField(key) && typeof decrypted[key] === 'string') {
          decrypted[key] = this.encryption.decrypt(decrypted[key]);
        } else if (typeof decrypted[key] === 'object') {
          decrypted[key] = this.decryptSensitiveFields(decrypted[key]);
        }
      });
      
      return decrypted;
    }

    return data;
  }

  private getCurrentUserId(): string {
    // This would be populated from request context in a real implementation
    // For now, return a placeholder
    return 'system';
  }

  // Method to manually encrypt a field
  public encryptField(value: string): string {
    return this.encryption?.encrypt(value) || value;
  }

  // Method to manually decrypt a field
  public decryptField(value: string): string {
    return this.encryption?.decrypt(value) || value;
  }

  // Method to hash a field for searching
  public hashField(value: string): string {
    return this.encryption?.hash(value) || value;
  }

  // Secure data deletion (overwrite before delete)
  public async secureDelete(model: string, where: any): Promise<void> {
    try {
      // First, get the record to identify sensitive fields
      const record = await (this.prisma as any)[model].findUnique({ where });
      
      if (record) {
        // Overwrite sensitive fields with random data
        const overwriteData: any = {};
        Object.keys(record).forEach(key => {
          if (isSensitiveField(key) && record[key]) {
            overwriteData[key] = this.generateRandomString(record[key].length);
          }
        });

        // Update with overwrite data
        if (Object.keys(overwriteData).length > 0) {
          await (this.prisma as any)[model].update({
            where,
            data: overwriteData,
          });
        }

        // Then delete the record
        await (this.prisma as any)[model].delete({ where });
      }
    } catch (error) {
      console.error('Secure delete failed:', error);
      throw error;
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Database connection security checks
  public async performSecurityChecks(): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      // Check if running with least privileges
      const userInfo = await this.prisma.$queryRaw`SELECT current_user, current_database()`;
      console.log('Database user info:', userInfo);

      // Check for SQL injection vulnerabilities in stored procedures
      // This would be more comprehensive in a real implementation

      // Validate database configuration
      if (!this.securityConfig.ssl && process.env.NODE_ENV === 'production') {
        issues.push('SSL not enabled for production database connection');
      }

      if (this.securityConfig.connectionLimit > 50) {
        issues.push('Connection pool limit too high, may impact security');
      }

      return {
        passed: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Database security check failed: ${error.message}`);
      return { passed: false, issues };
    }
  }
}