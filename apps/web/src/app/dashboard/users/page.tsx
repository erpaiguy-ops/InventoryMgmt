'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileRole, type Profile } from '@inventory-mgmt/shared-types';
import { Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DataTable, type DataTableColumn } from '@/components/common/data-table';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfile } from '@/hooks/use-profile';
import { useDeleteUser, useInviteUser, useUpdateUserRole, useUsers } from '@/hooks/use-users';
import { isAdmin, ROLE_LABELS } from '@/lib/auth/permissions';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/utils/format';

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.nativeEnum(ProfileRole).optional(),
});

type InviteValues = z.infer<typeof inviteSchema>;

function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const inviteUser = useInviteUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema) });

  const onSubmit = (values: InviteValues) => {
    inviteUser.mutate(values, {
      onSuccess: () => {
        toast.success(`Invitation sent to ${values.email}`);
        reset();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to invite user');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register('role')}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Staff (default)</option>
              {Object.values(ProfileRole).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending ? 'Sending...' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { data: users = [], isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  if (isProfileLoading) return <LoadingSpinner />;

  if (!isAdmin(profile?.role)) {
    return <p className="text-muted-foreground">You don&apos;t have access to this page.</p>;
  }

  const isSuperAdmin = profile?.role === ProfileRole.SUPER_ADMIN;

  const handleDelete = (user: Profile) => {
    if (!window.confirm(`Delete user ${user.email}? This cannot be undone.`)) return;

    deleteUser.mutate(user.id, {
      onSuccess: () => toast.success('User deleted'),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to delete user');
      },
    });
  };

  const columns: DataTableColumn<Profile>[] = [
    { key: 'email', header: 'Email' },
    { key: 'fullName', header: 'Name', render: (u) => u.fullName ?? '—' },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        isSuperAdmin ? (
          <Select
            value={u.role}
            onValueChange={(role) =>
              updateRole.mutate(
                { id: u.id, role: role as ProfileRole },
                {
                  onSuccess: () => toast.success('Role updated'),
                  onError: (error) => {
                    toast.error(
                      error instanceof ApiError ? error.message : 'Failed to update role',
                    );
                  },
                },
              )
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ProfileRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
        ),
    },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    ...(isSuperAdmin
      ? [
          {
            key: 'actions',
            header: '',
            render: (u: Profile) => (
              <Button variant="ghost" size="icon" onClick={() => handleDelete(u)}>
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            ),
          } satisfies DataTableColumn<Profile>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <InviteUserDialog />
      </div>

      <DataTable columns={columns} data={users} loading={isLoading} emptyMessage="No users yet." />
    </div>
  );
}
