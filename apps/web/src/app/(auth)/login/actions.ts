'use server';

import { buildSyntheticEmail } from '@inventory-mgmt/shared-types';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const orgSlug = String(formData.get('orgSlug') ?? '')
    .trim()
    .toLowerCase();
  const username = String(formData.get('username') ?? '');
  const password = String(formData.get('password') ?? '');

  const email = buildSyntheticEmail(orgSlug, username);

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Invalid organization, username, or password' };
  }

  redirect('/dashboard');
}
