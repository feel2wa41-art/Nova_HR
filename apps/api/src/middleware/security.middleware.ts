import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Remove sensitive headers that might leak information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    
    // Cache control for sensitive endpoints
    if (req.url.includes('/api/') && !req.url.includes('/public/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  }
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, url, ip, headers } = req;
    
    // Log request (sanitized)
    const logData = {
      method,
      url,
      ip: this.getClientIP(req),
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    
    // Don't log sensitive endpoints in production
    if (!this.isSensitiveEndpoint(url)) {
      console.log(`[REQUEST] ${JSON.stringify(logData)}`);
    }
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseLog = {
        ...logData,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };
      
      if (!this.isSensitiveEndpoint(url)) {
        console.log(`[RESPONSE] ${JSON.stringify(responseLog)}`);
      }
    });
    
    next();
  }
  
  private getClientIP(req: Request): string {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ) as string;
  }
  
  private isSensitiveEndpoint(url: string): boolean {
    const sensitivePatterns = ['/auth/', '/login', '/password', '/token'];
    return sensitivePatterns.some(pattern => url.includes(pattern));
  }
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests = parseInt(process.env.THROTTLE_LIMIT || '60');
  private readonly windowMs = parseInt(process.env.THROTTLE_TTL || '60') * 1000;
  
  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getClientIP(req);
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Clean old entries
    for (const [k, v] of this.requests.entries()) {
      if (v.resetTime < windowStart) {
        this.requests.delete(k);
      }
    }
    
    const requestInfo = this.requests.get(key) || { count: 0, resetTime: now + this.windowMs };
    
    if (requestInfo.resetTime < now) {
      requestInfo.count = 1;
      requestInfo.resetTime = now + this.windowMs;
    } else {
      requestInfo.count++;
    }
    
    this.requests.set(key, requestInfo);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - requestInfo.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(requestInfo.resetTime / 1000).toString());
    
    if (requestInfo.count > this.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((requestInfo.resetTime - now) / 1000),
      });
      return;
    }
    
    next();
  }
  
  private getClientIP(req: Request): string {
    return (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ) as string;
  }
}