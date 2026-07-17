'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useProfile } from '@/hooks/use-profile';
import { hasMinimumRole } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

import { navItems } from './nav-items';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useProfile();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-14 justify-center border-b px-4">
          <SheetTitle>Inventory ERP</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 p-3">
          {navItems
            .filter((item) => !item.minRole || hasMinimumRole(profile?.role, item.minRole))
            .map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
