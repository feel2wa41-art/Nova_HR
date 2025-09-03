import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY, RESOURCE_KEY } from '../decorators/roles.decorator';

export interface AuthUser {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  companyId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin: string;
  sessionId: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles, permissions, and resource from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredResource = this.reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no authorization requirements, allow access
    if (!requiredRoles && !requiredPermissions && !requiredResource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    // Check roles
    if (requiredRoles && !this.hasRequiredRoles(user.roles, requiredRoles)) {
      throw new ForbiddenException(`Insufficient role privileges. Required: ${requiredRoles.join(', ')}`);
    }

    // Check permissions
    if (requiredPermissions && !this.hasRequiredPermissions(user.permissions, requiredPermissions)) {
      throw new ForbiddenException(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
    }

    // Check resource-based access
    if (requiredResource && !this.hasResourceAccess(user, requiredResource, request)) {
      throw new ForbiddenException(`Access denied to resource: ${requiredResource}`);
    }

    // Log access for audit
    this.logAccess(user, context);

    return true;
  }

  private hasRequiredRoles(userRoles: string[], requiredRoles: string[]): boolean {
    // Super admin bypasses all role checks
    if (userRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    // Check if user has at least one of the required roles
    return requiredRoles.some(role => userRoles.includes(role));
  }

  private hasRequiredPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    // Check if user has all required permissions
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  private hasResourceAccess(user: AuthUser, resource: string, request: any): boolean {
    const { params, body, query } = request;
    
    // Resource-based access control logic
    switch (resource) {
      case 'own_profile':
        // Users can only access their own profile
        const targetUserId = params.id || params.userId || body.userId;
        return !targetUserId || targetUserId === user.sub;

      case 'company_data':
        // Users can only access data from their own company
        const targetCompanyId = params.companyId || body.companyId || query.companyId;
        return !targetCompanyId || targetCompanyId === user.companyId;

      case 'department_data':
        // Department managers can access their department data
        if (user.roles.includes('DEPARTMENT_MANAGER')) {
          // Additional logic to check if user manages this department
          return this.checkDepartmentAccess(user, params.departmentId);
        }
        return user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN') || user.roles.includes('HR_MANAGER');

      case 'subordinate_data':
        // Managers can access data of their subordinates
        if (user.roles.includes('DEPARTMENT_MANAGER') || user.roles.includes('HR_MANAGER')) {
          return this.checkSubordinateAccess(user, params.userId);
        }
        return user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');

      default:
        // Default allow for undefined resources
        return true;
    }
  }

  private checkDepartmentAccess(user: AuthUser, departmentId: string): boolean {
    // TODO: Implement department access check
    // This should query the database to verify if the user manages the department
    return true; // Placeholder
  }

  private checkSubordinateAccess(user: AuthUser, targetUserId: string): boolean {
    // TODO: Implement subordinate access check
    // This should query the database to verify if the target user reports to the current user
    return true; // Placeholder
  }

  private logAccess(user: AuthUser, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    // Log for audit trail (in production, use proper logging service)
    const auditLog = {
      userId: user.sub,
      email: user.email,
      method,
      url,
      timestamp: new Date().toISOString(),
      sessionId: user.sessionId,
      companyId: user.companyId,
    };

    // Don't log sensitive endpoints
    if (!url.includes('/auth/') && !url.includes('/password')) {
      console.log(`[AUDIT] ${JSON.stringify(auditLog)}`);
    }
  }
}