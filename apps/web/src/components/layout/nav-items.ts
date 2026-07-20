import {
  ACTIONS,
  MODULES,
  type ModuleName,
  type PermissionAction,
} from '@inventory-mgmt/shared-types';
import {
  CheckSquare,
  Contact,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  User,
  Users,
  Warehouse,
} from 'lucide-react';

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
    href: '/dashboard/inventory',
    label: 'Inventory',
    icon: Warehouse,
    permission: { module: MODULES.INVENTORY, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/procurement',
    label: 'Procurement',
    icon: ShoppingCart,
    permission: { module: MODULES.PROCUREMENT, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/approvals',
    label: 'Approvals',
    icon: CheckSquare,
    permission: { module: MODULES.APPROVALS, action: ACTIONS.VIEW },
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
