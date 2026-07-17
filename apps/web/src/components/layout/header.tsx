'use client';

import { LogOut, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useLowStockRealtime } from '@/hooks/use-inventory';
import { useProfile } from '@/hooks/use-profile';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { authService } from '@/services/auth.service';

import { MobileNav } from './mobile-nav';
import { NotificationBell } from './notification-bell';

export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  useLowStockRealtime(Boolean(user));

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authService.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="bg-background flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <MobileNav />
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="max-w-[160px] truncate text-sm">
                {profile?.fullName ?? user?.email ?? 'Account'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate text-sm font-medium">{user?.email}</span>
                {profile ? (
                  <span className="text-muted-foreground text-xs">{ROLE_LABELS[profile.role]}</span>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/dashboard/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSignOut} disabled={signingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
