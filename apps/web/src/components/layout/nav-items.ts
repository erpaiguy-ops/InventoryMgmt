import {
  ACTIONS,
  MODULES,
  type ModuleName,
  type PermissionAction,
} from '@inventory-mgmt/shared-types';
import { Contact, LayoutDashboard, Package, Settings, User, Users } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: { module: ModuleName; action: PermissionAction };
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/dashboard/items',
    label: 'Items',
    icon: Package,
    permission: { module: MODULES.ITEMS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/partners',
    label: 'Partners',
    icon: Contact,
    permission: { module: MODULES.PARTNERS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    permission: { module: MODULES.SETTINGS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: Users,
    permission: { module: MODULES.USERS, action: ACTIONS.VIEW },
  },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];
