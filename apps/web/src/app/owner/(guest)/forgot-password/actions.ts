'use server';

import { createClient } from '@/lib/supabase/server';

export interface ForgotPasswordState {
  error?: string;
  submitted?: boolean;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { submitted: true };
}
