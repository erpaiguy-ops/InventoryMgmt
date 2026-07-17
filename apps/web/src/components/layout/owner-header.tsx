'use client';

import { LogOut, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/services/auth.service';

export function OwnerHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authService.signOut();
      router.push('/owner/login');
      router.refresh();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="bg-background flex h-14 items-center justify-between border-b px-4">
      <span className="text-muted-foreground truncate text-sm">{user?.email}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={signingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </div>
    </header>
  );
}
