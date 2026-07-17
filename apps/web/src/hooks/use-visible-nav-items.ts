'use client';

import { hasPermission } from '@inventory-mgmt/shared-types';
import { useMemo } from 'react';

import type { NavItem } from '@/components/layout/nav-items';
import { usePrincipal } from '@/hooks/use-principal';

/** Shared by Sidebar and MobileNav so the visibility filter is defined once, not duplicated. */
export function useVisibleNavItems(items: NavItem[]): NavItem[] {
  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;

  return useMemo(
    () =>
      items.filter(
        (item) =>
          !item.permission ||
          hasPermission(permissions, item.permission.module, item.permission.action),
      ),
    [items, permissions],
  );
}
