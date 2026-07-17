'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useVisibleNavItems } from '@/hooks/use-visible-nav-items';
import { cn } from '@/lib/utils';

import { navItems } from './nav-items';

export function Sidebar() {
  const pathname = usePathname();
  const visibleNavItems = useVisibleNavItems(navItems);

  return (
    <aside className="bg-card hidden w-64 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold">Inventory ERP</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
