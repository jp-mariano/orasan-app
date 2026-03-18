import { redirect } from 'next/navigation';

import type { CheckoutSerialized } from '@freemius/sdk';

import { freemius } from '@/lib/freemius';
import { createClient } from '@/lib/supabase/server';

import { UserSettingsClient } from './user-settings-client';

export default async function UserSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const checkout = await freemius.checkout.create({
    user: {
      email: user.email ?? '',
      name:
        (user.user_metadata as { full_name?: string; name?: string } | null)
          ?.full_name ??
        (user.user_metadata as { full_name?: string; name?: string } | null)
          ?.name,
    },
    isSandbox: process.env.NODE_ENV !== 'production',
  });

  const checkoutSerialized = checkout.serialize() as CheckoutSerialized;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const portalEndpoint = `${appUrl}/api/portal`;

  return (
    <UserSettingsClient
      checkout={checkoutSerialized}
      portalEndpoint={portalEndpoint}
    />
  );
}
