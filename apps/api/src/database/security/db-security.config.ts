import { ConfigService } from '@nestjs/config';

export interface DatabaseSecurityConfig {
  ssl: boolean;
  connectionLimit: number;
  queryTimeout: number;
  encryption: {
    enabled: boolean;
    algorithm: string;
    key: string;
  };
  audit: {
    enabled: boolean;
    logQueries: boolean;
    logLevel: 'all' | 'write' | 'sensitive';
  };
}

export const createDatabaseSecurityConfig = (configService: ConfigService): DatabaseSecurityConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    ssl: isProduction || configService.get('DB_SSL_ENABLED', 'false') === 'true',
    connectionLimit: parseInt(configService.get('DATABASE_POOL_MAX', '10')),
    queryTimeout: parseInt(configService.get('DB_QUERY_TIMEOUT', '30000')),
    encryption: {
      enabled: isProduction || configService.get('DB_ENCRYPTION_ENABLED', 'false') === 'true',
      algorithm: 'aes-256-gcm',
      key: configService.get('DATA_ENCRYPTION_KEY', ''),
    },
    audit: {
      enabled: isProduction || configService.get('DB_AUDIT_ENABLED', 'false') === 'true',
      logQueries: configService.get('DB_LOG_QUERIES', 'false') === 'true',
      logLevel: configService.get('DB_AUDIT_LEVEL', 'sensitive') as 'all' | 'write' | 'sensitive',
    },
  };
};

// Database field encryption utilities
export class DatabaseEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyString = this.configService.get('DATA_ENCRYPTION_KEY');
    if (!keyString) {
      throw new Error('DATA_ENCRYPTION_KEY is required for database encryption');
    }
    this.key = Buffer.from(keyString, 'base64');
  }

  encrypt(text: string): string {
    if (!text) return text;

    const crypto = require('crypto');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('nova-hr-aad', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

    try {
      const crypto = require('crypto');
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, this.key);
      decipher.setAAD(Buffer.from('nova-hr-aad', 'utf8'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData; // Return as-is if decryption fails
    }
  }

  // Hash sensitive data for searching (one-way)
  hash(data: string): string {
    if (!data) return data;

    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.key)
      .update(data)
      .digest('hex');
  }
}

// Audit logging for database operations
export class DatabaseAuditLogger {
  constructor(
    private configService: ConfigService,
    private securityConfig: DatabaseSecurityConfig,
  ) {}

  logQuery(query: string, params: any[] = [], userId?: string, result?: any) {
    if (!this.securityConfig.audit.enabled) return;

    const shouldLog = this.shouldLogQuery(query);
    if (!shouldLog) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId: userId || 'system',
      query: this.sanitizeQuery(query),
      params: this.sanitizeParams(params),
      result: this.sanitizeResult(result),
      ip: this.getCurrentIP(),
      sessionId: this.getCurrentSessionId(),
    };

    // In production, send to proper audit system (database, file, external service)
    console.log(`[DB_AUDIT] ${JSON.stringify(auditEntry)}`);
  }

  private shouldLogQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    
    switch (this.securityConfig.audit.logLevel) {
      case 'all':
        return true;
      
      case 'write':
        return /^(insert|update|delete|create|drop|alter|grant|revoke)/.test(normalizedQuery);
      
      case 'sensitive':
        return /^(insert|update|delete|create|drop|alter|grant|revoke)/.test(normalizedQuery) ||
               normalizedQuery.includes('password') ||
               normalizedQuery.includes('token') ||
               normalizedQuery.includes('secret') ||
               normalizedQuery.includes('auth') ||
               normalizedQuery.includes('session');
      
      default:
        return false;
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove or mask sensitive data from query
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'");
  }

  private sanitizeParams(params: any[]): any[] {
    if (!params || params.length === 0) return [];
    
    return params.map(param => {
      if (typeof param === 'string') {
        // Check if it might be a password/token/secret
        if (param.length > 10 && /^[A-Za-z0-9+/=]+$/.test(param)) {
          return '[REDACTED]';
        }
      }
      return param;
    });
  }

  private sanitizeResult(result: any): any {
    if (!result) return null;
    
    // Don't log full results, just metadata
    if (Array.isArray(result)) {
      return { type: 'array', count: result.length };
    } else if (typeof result === 'object') {
      return { type: 'object', hasData: Object.keys(result).length > 0 };
    }
    
    return { type: typeof result };
  }

  private getCurrentIP(): string {
    // This would be populated by request context in a real implementation
    return 'unknown';
  }

  private getCurrentSessionId(): string {
    // This would be populated by request context in a real implementation
    return 'unknown';
  }
}

// Sensitive field definitions
export const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'salt',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'private_key',
  'api_key',
  'ssn',
  'social_security_number',
  'credit_card',
  'bank_account',
  'salary',
  'wage',
  'compensation',
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];

// Utility to check if a field should be encrypted
export const isSensitiveField = (fieldName: string): boolean => {
  return SENSITIVE_FIELDS.some(sensitive => 
    fieldName.toLowerCase().includes(sensitive)
  );
};