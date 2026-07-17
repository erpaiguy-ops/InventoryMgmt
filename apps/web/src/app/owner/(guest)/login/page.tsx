'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ownerLoginAction, type OwnerLoginState } from './actions';

const initialState: OwnerLoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

export default function OwnerLoginPage() {
  const [state, formAction] = useFormState(ownerLoginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner sign in</CardTitle>
        <CardDescription>Manage tenant organizations</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
