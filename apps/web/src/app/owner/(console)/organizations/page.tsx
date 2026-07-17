'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Organization } from '@inventory-mgmt/shared-types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useBootstrapAdmin,
  useCreateOrganization,
  useOrganizations,
  useSetOrganizationStatus,
} from '@/hooks/use-organizations';
import { ApiError } from '@/services/api-client';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false);
  const createOrganization = useCreateOrganization();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgFormValues>({ resolver: zodResolver(createOrgSchema) });

  const onSubmit = async (values: CreateOrgFormValues) => {
    try {
      await createOrganization.mutateAsync(values);
      toast.success(`${values.name} created`);
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to create organization');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New organization</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="acme" {...register('slug')} />
            {errors.slug ? <p className="text-destructive text-sm">{errors.slug.message}</p> : null}
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

const bootstrapAdminSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .regex(/^[a-z0-9._-]+$/, 'Lowercase letters, numbers, dots, underscores, hyphens only'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
});

type BootstrapAdminFormValues = z.infer<typeof bootstrapAdminSchema>;

function BootstrapAdminDialog({ organization }: { organization: Organization }) {
  const [open, setOpen] = useState(false);
  const bootstrapAdmin = useBootstrapAdmin();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BootstrapAdminFormValues>({ resolver: zodResolver(bootstrapAdminSchema) });

  const onSubmit = async (values: BootstrapAdminFormValues) => {
    try {
      await bootstrapAdmin.mutateAsync({ id: organization.id, ...values });
      toast.success(`Admin user ${values.username} created for ${organization.name}`);
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to create admin user');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Create admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create first admin for {organization.name}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          They&apos;ll sign in at <strong>/login</strong> with organization{' '}
          <strong>{organization.slug}</strong> and this username and password.
        </p>
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

export default function OwnerOrganizationsPage() {
  const { data: organizations, isLoading } = useOrganizations();
  const setStatus = useSetOrganizationStatus();

  const handleToggleStatus = async (id: string, currentStatus: 'active' | 'suspended') => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await setStatus.mutateAsync({ id, status: next });
      toast.success(`Organization ${next}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to update organization');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <CreateOrganizationDialog />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(organizations ?? []).map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell className="text-muted-foreground">{org.slug}</TableCell>
                <TableCell>
                  <Badge variant={org.status === 'active' ? 'secondary' : 'destructive'}>
                    {org.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <BootstrapAdminDialog organization={org} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(org.id, org.status)}
                      disabled={setStatus.isPending}
                    >
                      {org.status === 'active' ? 'Suspend' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(organizations ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center">
                  No organizations yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
