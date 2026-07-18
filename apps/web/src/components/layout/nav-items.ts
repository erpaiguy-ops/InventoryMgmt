import {
  ACTIONS,
  MODULES,
  type ModuleName,
  type PermissionAction,
} from '@inventory-mgmt/shared-types';
import {
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
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
    href: '/dashboard/products',
    label: 'Products',
    icon: Package,
    permission: { module: MODULES.PRODUCTS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/inventory',
    label: 'Inventory',
    icon: Warehouse,
    permission: { module: MODULES.INVENTORY, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/purchase-orders',
    label: 'Purchase Orders',
    icon: ShoppingCart,
    permission: { module: MODULES.PURCHASE_ORDERS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/sales-orders',
    label: 'Sales Orders',
    icon: Truck,
    permission: { module: MODULES.SALES_ORDERS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/suppliers',
    label: 'Suppliers',
    icon: Building2,
    permission: { module: MODULES.SUPPLIERS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: FileText,
    permission: { module: MODULES.REPORTS, action: ACTIONS.VIEW },
  },
  {
    href: '/dashboard/users',
    label: 'Users',
    icon: Users,
    permission: { module: MODULES.USERS, action: ACTIONS.VIEW },
  },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];
