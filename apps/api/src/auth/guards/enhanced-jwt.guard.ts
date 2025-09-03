import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnhancedJwtAuthGuard extends AuthGuard('jwt') {
  private readonly blacklistedTokens = new Set<string>(); // In production, use Redis
  private readonly maxSessionDuration = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Check if token is blacklisted
    if (this.blacklistedTokens.has(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      // Verify token and decode payload
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Additional security checks
      await this.performSecurityChecks(payload, request, token);

      // Attach user to request
      request['user'] = payload;

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      } else if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      } else {
        console.error('JWT Guard Error:', error);
        throw new UnauthorizedException('Token validation failed');
      }
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }

  private async performSecurityChecks(payload: any, request: Request, token: string) {
    // Check token age
    const tokenAge = Date.now() - (payload.iat * 1000);
    if (tokenAge > this.maxSessionDuration) {
      this.blacklistedTokens.add(token);
      throw new UnauthorizedException('Token too old, please re-authenticate');
    }

    // Check if user is still active
    if (payload.status === 'INACTIVE' || payload.status === 'SUSPENDED') {
      this.blacklistedTokens.add(token);
      throw new ForbiddenException('Account is inactive or suspended');
    }

    // IP address validation (if enabled)
    if (payload.ipAddress && this.configService.get('VALIDATE_IP_ADDRESS') === 'true') {
      const currentIP = this.getClientIP(request);
      if (payload.ipAddress !== currentIP) {
        throw new ForbiddenException('Token used from different IP address');
      }
    }

    // User agent validation (if enabled)
    if (payload.userAgent && this.configService.get('VALIDATE_USER_AGENT') === 'true') {
      const currentUserAgent = request.headers['user-agent'];
      if (payload.userAgent !== currentUserAgent) {
        throw new ForbiddenException('Token used from different device');
      }
    }

    // Check for concurrent sessions (if enabled)
    const maxConcurrentSessions = parseInt(
      this.configService.get('MAX_CONCURRENT_SESSIONS', '5')
    );
    if (payload.sessionCount > maxConcurrentSessions) {
      throw new ForbiddenException('Too many concurrent sessions');
    }

    // Rate limiting per user
    await this.checkUserRateLimit(payload.sub, request);
  }

  private getClientIP(request: Request): string {
    return (
      request.headers['cf-connecting-ip'] ||
      request.headers['x-real-ip'] ||
      request.headers['x-forwarded-for'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    ) as string;
  }

  private async checkUserRateLimit(userId: string, request: Request) {
    // Implement user-specific rate limiting
    // This is a simplified version - in production use Redis
    const userRequests = this.getUserRequestCount(userId);
    const maxRequestsPerHour = parseInt(
      this.configService.get('MAX_USER_REQUESTS_PER_HOUR', '1000')
    );

    if (userRequests > maxRequestsPerHour) {
      throw new ForbiddenException('User rate limit exceeded');
    }
  }

  private getUserRequestCount(userId: string): number {
    // Simplified implementation - use Redis in production
    return 0; // Placeholder
  }

  // Method to blacklist a token (for logout)
  public blacklistToken(token: string) {
    this.blacklistedTokens.add(token);
  }

  // Method to clear old blacklisted tokens (cleanup)
  public cleanupBlacklist() {
    // In production, implement proper cleanup logic with Redis TTL
    if (this.blacklistedTokens.size > 10000) {
      this.blacklistedTokens.clear();
    }
  }
}