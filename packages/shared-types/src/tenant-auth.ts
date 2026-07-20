/**
 * v2 shared types: multi-tenant principals, module/action permissions, and
 * the synthetic-email construction used by username/password tenant login.
 * Deliberately separate from auth.ts (v1's single-workspace ProfileRole
 * model), which stays untouched for backward compatibility.
 */

export const MODULES = {
  ITEMS: 'items',
  PARTNERS: 'partners',
  INVENTORY: 'inventory',
  PROCUREMENT: 'procurement',
  APPROVALS: 'approvals',
  SETTINGS: 'settings',
  USERS: 'users',
} as const;

export type ModuleName = (typeof MODULES)[keyof typeof MODULES];

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

export type PermissionAction = (typeof ACTIONS)[keyof typeof ACTIONS];

export interface ModulePermission {
  module: ModuleName;
  action: PermissionAction;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface TenantPrincipal {
  type: 'tenant';
  id: string;
  tenantId: string;
  username: string;
  fullName: string | null;
  roleId: string;
  roleSlug: string;
  roleName: string;
  permissions: Partial<Record<ModuleName, PermissionAction[]>>;
}

export interface OwnerPrincipal {
  type: 'owner';
  id: string;
  email: string;
  fullName: string | null;
}

export type Principal = TenantPrincipal | OwnerPrincipal;

/**
 * Deterministic synthetic email for username/password tenant login, so
 * Supabase Auth's normal email-based machinery can be reused unchanged.
 * Deterministic (no pre-lookup query before signInWithPassword) to avoid a
 * username-enumeration timing oracle. Shared byte-for-byte between the
 * NestJS backend and the Next.js frontend to eliminate drift risk.
 */
export function buildSyntheticEmail(orgSlug: string, username: string): string {
  const normalizedSlug = orgSlug.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  return `${normalizedUsername}@${normalizedSlug}.internal.local`;
}

export function hasPermission(
  permissions: Partial<Record<ModuleName, PermissionAction[]>> | undefined,
  module: ModuleName,
  action: PermissionAction,
): boolean {
  return permissions?.[module]?.includes(action) ?? false;
}
