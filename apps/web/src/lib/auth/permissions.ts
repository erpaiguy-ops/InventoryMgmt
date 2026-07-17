import { ProfileRole } from '@inventory-mgmt/shared-types';

const ROLE_RANK: Record<ProfileRole, number> = {
  [ProfileRole.STAFF]: 0,
  [ProfileRole.MANAGER]: 1,
  [ProfileRole.ADMIN]: 2,
  [ProfileRole.SUPER_ADMIN]: 3,
};

export function hasRole(role: ProfileRole | undefined, allowed: ProfileRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export function hasMinimumRole(role: ProfileRole | undefined, minimum: ProfileRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isAdmin(role: ProfileRole | undefined): boolean {
  return hasMinimumRole(role, ProfileRole.ADMIN);
}

export function isManager(role: ProfileRole | undefined): boolean {
  return hasMinimumRole(role, ProfileRole.MANAGER);
}

export const ROLE_LABELS: Record<ProfileRole, string> = {
  [ProfileRole.SUPER_ADMIN]: 'Super Admin',
  [ProfileRole.ADMIN]: 'Admin',
  [ProfileRole.MANAGER]: 'Manager',
  [ProfileRole.STAFF]: 'Staff',
};
