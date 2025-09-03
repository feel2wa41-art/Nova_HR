import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const RESOURCE_KEY = 'resource';
export const Resource = (resource: string) => SetMetadata(RESOURCE_KEY, resource);

// Combined decorator for role-based access control
export const RequireAuth = (roles?: string[], permissions?: string[], resource?: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (roles) {
      SetMetadata(ROLES_KEY, roles)(target, propertyKey, descriptor);
    }
    if (permissions) {
      SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
    }
    if (resource) {
      SetMetadata(RESOURCE_KEY, resource)(target, propertyKey, descriptor);
    }
  };
};

// Specific role decorators for common use cases
export const RequireAdmin = () => Roles('ADMIN', 'SUPER_ADMIN');
export const RequireManager = () => Roles('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER');
export const RequireHR = () => Roles('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER');
export const RequireEmployee = () => Roles('ADMIN', 'SUPER_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE');

// Permission-based decorators
export const CanManageUsers = () => Permissions('manage_users');
export const CanViewReports = () => Permissions('view_reports');
export const CanManageAttendance = () => Permissions('manage_attendance');
export const CanManageLeaves = () => Permissions('manage_leaves');
export const CanManageApprovals = () => Permissions('manage_approvals');