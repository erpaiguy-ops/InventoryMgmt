'use client';

import type { Notification } from '@inventory-mgmt/shared-types';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';

const TYPE_ICON: Record<Notification['type'], string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
};

export function NotificationBell() {
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const unread = notifications.filter((n) => !n.readAt);

  const handleClick = (notification: Notification) => {
    if (!notification.readAt) markAsRead.mutate(notification.id);

    const url = notification.metadata?.url;
    if (typeof url === 'string') router.push(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread.length > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[28rem] w-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={(event) => {
                event.stopPropagation();
                markAllAsRead.mutate(unread.map((n) => n.id));
              }}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">No notifications</p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'cursor-pointer items-start gap-2 p-3',
                !notification.readAt && 'bg-muted/50',
              )}
              onSelect={() => handleClick(notification)}
            >
              <span className="text-lg leading-none">{TYPE_ICON[notification.type]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{notification.title}</p>
                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">{notification.message}</p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
