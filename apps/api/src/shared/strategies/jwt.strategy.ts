import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      return null;
    }

    try {
      // Verify user still exists and is active
      if (!payload.sub || typeof payload.sub !== 'string') {
        return null;
      }
      
      const user = await this.prisma.auth_user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return null;
      }

      if (user.status !== 'ACTIVE') {
        return null;
      }

      return {
        id: payload.sub,
        userId: payload.sub,  // Add userId for controllers that expect it
        sub: payload.sub,  // For backward compatibility
        email: payload.email,
        role: payload.role,
        roles: [payload.role],  // Some controllers expect roles array
        tenantId: payload.tenantId,
        companyId: payload.tenantId,  // RolesGuard expects companyId
        status: user.status,  // RolesGuard expects status
        lastLogin: user.last_login?.toISOString(),
        sessionId: payload.sub, // Using user ID as session ID for now
        permissions: [], // Empty array for now - can be populated later
      };
    } catch (error) {
      console.error('JWT Strategy validation error:', error);
      return null;
    }
  }
}