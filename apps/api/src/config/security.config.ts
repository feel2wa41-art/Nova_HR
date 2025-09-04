import { ConfigService } from '@nestjs/config';

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  rateLimit: {
    ttl: number;
    limit: number;
  };
  encryption: {
    dataKey: string;
    cookieSecret: string;
  };
  ssl: {
    keyPath?: string;
    certPath?: string;
  };
}

export const createSecurityConfig = (configService: ConfigService): SecurityConfig => {
  // Validate required environment variables
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  
  for (const varName of requiredVars) {
    const value = configService.get(varName);
    if (!value || value.length < 32) {
      throw new Error(`${varName} must be set and at least 32 characters long for security`);
    }
  }

  // Parse CORS origins
  const corsOrigin = configService.get('CORS_ORIGIN', '*');
  const origins = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((origin: string) => origin.trim());

  // Validate production settings
  if (process.env.NODE_ENV === 'production') {
    if (corsOrigin === '*' || corsOrigin.includes('localhost')) {
      throw new Error('CORS must be restricted in production environment');
    }
    
    if (!configService.get('DATA_ENCRYPTION_KEY')) {
      throw new Error('DATA_ENCRYPTION_KEY must be set in production');
    }
  }

  return {
    jwt: {
      secret: configService.get('JWT_SECRET'),
      expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
      refreshSecret: configService.get('JWT_REFRESH_SECRET'),
      refreshExpiresIn: configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    },
    cors: {
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-CSRF-Token'],
    },
    rateLimit: {
      ttl: parseInt(configService.get('THROTTLE_TTL', '60')),
      limit: parseInt(configService.get('THROTTLE_LIMIT', '60')),
    },
    encryption: {
      dataKey: configService.get('DATA_ENCRYPTION_KEY', ''),
      cookieSecret: configService.get('COOKIE_SECRET', ''),
    },
    ssl: {
      keyPath: configService.get('SSL_KEY_PATH'),
      certPath: configService.get('SSL_CERT_PATH'),
    },
  };
};

// Security validation middleware
export const validateSecurityConfig = (config: SecurityConfig) => {
  const errors: string[] = [];

  // JWT validation
  if (config.jwt.secret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long');
  }

  if (config.jwt.refreshSecret.length < 32) {
    errors.push('JWT refresh secret must be at least 32 characters long');
  }

  // CORS validation
  if (process.env.NODE_ENV === 'production' && config.cors.origin === '*') {
    errors.push('CORS origin must be restricted in production');
  }

  // Rate limiting validation
  if (config.rateLimit.limit > 1000) {
    errors.push('Rate limit too high for security');
  }

  if (errors.length > 0) {
    throw new Error(`Security configuration errors: ${errors.join(', ')}`);
  }
};

// Generate secure random string
export const generateSecureSecret = (length: number = 32): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('base64');
};

// Password strength validation
export const validatePasswordStrength = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

// Sanitize sensitive data for logging
export const sanitizeForLogging = (data: any): any => {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
};