import {
  ACTIONS,
  MODULES,
  type ModuleName,
  type PermissionAction,
} from '@inventory-mgmt/shared-types';
import { LayoutDashboard, User, Users } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: { module: ModuleName; action: PermissionAction };
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: Users,
    permission: { module: MODULES.USERS, action: ACTIONS.VIEW },
  },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];
