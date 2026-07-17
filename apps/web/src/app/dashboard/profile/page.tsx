'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { usePrincipal } from '@/hooks/use-principal';
import { ApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Must be at least 8 characters'),
    newPassword: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

function ProfileDetailsCard() {
  const { user } = useAuth();
  const { principal } = usePrincipal();
  const queryClient = useQueryClient();
  const fullName = principal?.type === 'tenant' ? principal.fullName : null;
  const roleName = principal?.type === 'tenant' ? principal.roleName : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { fullName: fullName ?? '' },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await authService.updateProfile(values);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to update profile');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">{user?.email}</span>
          {roleName ? <Badge variant="secondary">{roleName}</Badge> : null}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName ? (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      await authService.changePassword(values);
      toast.success('Password changed');
      reset();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to change password');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" {...register('currentPassword')} />
            {errors.currentPassword ? (
              <p className="text-destructive text-sm">{errors.currentPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" {...register('newPassword')} />
            {errors.newPassword ? (
              <p className="text-destructive text-sm">{errors.newPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword ? (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { isLoading } = usePrincipal();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <ProfileDetailsCard />
      <ChangePasswordCard />
    </div>
  );
}
