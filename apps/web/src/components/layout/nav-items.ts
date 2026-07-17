import { ProfileRole } from '@inventory-mgmt/shared-types';
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
  minRole?: ProfileRole;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/dashboard/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { href: '/dashboard/sales-orders', label: 'Sales Orders', icon: Truck },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/users', label: 'Users', icon: Users, minRole: ProfileRole.ADMIN },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];
