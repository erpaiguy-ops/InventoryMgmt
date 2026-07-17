'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ACTIONS, hasPermission, MODULES } from '@inventory-mgmt/shared-types';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
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
import { usePrincipal } from '@/hooks/use-principal';
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useRoles,
  useUpdateUserRole,
  useUsers,
} from '@/hooks/use-users';
import { ApiError } from '@/services/api-client';
import type { TenantUser } from '@/services/users.service';
import { formatDate } from '@/utils/format';

const createUserSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .regex(/^[a-z0-9._-]+$/, 'Lowercase letters, numbers, dots, underscores, hyphens only'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  roleId: z.string().min(1, 'Role is required'),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({ resolver: zodResolver(createUserSchema) });

  const onSubmit = async (values: CreateUserValues) => {
    try {
      await createUser.mutateAsync(values);
      toast.success(`${values.username} created`);
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to create user');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register('username')} />
            {errors.username ? (
              <p className="text-destructive text-sm">{errors.username.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName ? (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password ? (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleId">Role</Label>
            <Select value={watch('roleId')} onValueChange={(value) => setValue('roleId', value)}>
              <SelectTrigger id="roleId">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId ? (
              <p className="text-destructive text-sm">{errors.roleId.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordButton({ userId }: { userId: string }) {
  const resetPassword = useResetUserPassword();

  const handleClick = () => {
    const newPassword = window.prompt('Enter a new password for this user (min 8 characters):');
    if (!newPassword) return;
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    resetPassword.mutate(
      { id: userId, newPassword },
      {
        onSuccess: () => toast.success('Password reset'),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : 'Failed to reset password'),
      },
    );
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} disabled={resetPassword.isPending}>
      <KeyRound className="h-4 w-4" />
    </Button>
  );
}

export default function UsersPage() {
  const { principal, isLoading: isPrincipalLoading } = usePrincipal();
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  if (isPrincipalLoading) return <LoadingSpinner />;

  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canManage = hasPermission(permissions, MODULES.USERS, ACTIONS.MANAGE);
  const canDelete = hasPermission(permissions, MODULES.USERS, ACTIONS.DELETE);
  const canCreate = hasPermission(permissions, MODULES.USERS, ACTIONS.CREATE);

  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId;

  const handleDelete = (user: TenantUser) => {
    if (!window.confirm(`Delete user ${user.username}? This cannot be undone.`)) return;

    deleteUser.mutate(user.id, {
      onSuccess: () => toast.success('User deleted'),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : 'Failed to delete user');
      },
    });
  };

  const columns: DataTableColumn<TenantUser>[] = [
    { key: 'username', header: 'Username' },
    { key: 'fullName', header: 'Name', render: (u) => u.fullName ?? '—' },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        canManage ? (
          <Select
            value={u.roleId}
            onValueChange={(roleId) =>
              updateRole.mutate(
                { id: u.id, roleId },
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
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{roleName(u.roleId)}</Badge>
        ),
    },
    { key: 'status', header: 'Status', render: (u) => <Badge variant="outline">{u.status}</Badge> },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    ...(canManage || canDelete
      ? [
          {
            key: 'actions',
            header: '',
            render: (u: TenantUser) => (
              <div className="flex items-center justify-end gap-1">
                {canManage ? <ResetPasswordButton userId={u.id} /> : null}
                {canDelete ? (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u)}>
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ),
          } satisfies DataTableColumn<TenantUser>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        {canCreate ? <CreateUserDialog /> : null}
      </div>

      <DataTable columns={columns} data={users} loading={isLoading} emptyMessage="No users yet." />
    </div>
  );
}
