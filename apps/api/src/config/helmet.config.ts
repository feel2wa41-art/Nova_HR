import { ConfigService } from '@nestjs/config';
import { HelmetOptions } from 'helmet';

export const createHelmetConfig = (configService: ConfigService): HelmetOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction 
          ? ["'self'"] 
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow unsafe for dev/swagger
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", ...(configService.get('CORS_ORIGIN', '').split(',') || [])],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disable if needed for file uploads
    
    // Cross-Origin Opener Policy  
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Frameguard
    frameguard: { action: 'deny' },
    
    // Hide Powered-By
    hidePoweredBy: true,
    
    // HSTS (HTTP Strict Transport Security)
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // X-XSS-Protection
    xssFilter: true,
  };
};