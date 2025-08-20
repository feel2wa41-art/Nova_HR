export interface User {
  id: string;
  email: string;
  name: string;
  title?: string;
  orgId?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'PROVIDER_ADMIN'
  | 'CUSTOMER_ADMIN'
  | 'HR_MANAGER'
  | 'MANAGER'
  | 'EMPLOYEE';

export type UserStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING';