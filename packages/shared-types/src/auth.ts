import type { Timestamps } from './common';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  VIEWER = 'viewer',
}

export interface User extends Timestamps {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  avatarUrl?: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}
