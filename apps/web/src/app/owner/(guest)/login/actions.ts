'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export interface OwnerLoginState {
  error?: string;
}

/** Real email, unlike tenant login — no org slug or synthetic email involved. */
export async function ownerLoginAction(
  _prevState: OwnerLoginState,
  formData: FormData,
): Promise<OwnerLoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect('/owner');
}
