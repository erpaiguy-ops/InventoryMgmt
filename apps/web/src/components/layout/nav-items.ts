import {
  ACTIONS,
  MODULES,
  type ModuleName,
  type PermissionAction,
} from '@inventory-mgmt/shared-types';
import {
  Building,
  CheckSquare,
  ClipboardList,
  Contact,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
  UserCircle,
  Users,
  Warehouse,
  Wallet,
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
    href: '/dashboard/sales',
    label: 'Sales',
    icon: ShoppingBag,
    permission: { module: MODULES.SALES, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/financials',
    label: 'Financials',
    icon: Wallet,
    permission: { module: MODULES.FINANCIALS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/fixed-assets',
    label: 'Fixed Assets',
    icon: Building,
    permission: { module: MODULES.FIXED_ASSETS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/hrm',
    label: 'HRM & Payroll',
    icon: UserCircle,
    permission: { module: MODULES.HRM, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/fleet',
    label: 'Fleet',
    icon: Truck,
    permission: { module: MODULES.FLEET, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/pos',
    label: 'POS',
    icon: Receipt,
    permission: { module: MODULES.POS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/approvals',
    label: 'Approvals',
    icon: CheckSquare,
    permission: { module: MODULES.APPROVALS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/audit',
    label: 'Audit',
    icon: ClipboardList,
    permission: { module: MODULES.SETTINGS, action: ACTIONS.MANAGE },
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
