'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import type { CheckoutSerialized } from '@freemius/sdk';

import { CheckoutProvider } from '@/react-starter/components/checkout-provider';

export default function AppCheckoutProvider(props: {
  children: React.ReactNode;
  checkout: CheckoutSerialized;
  /**
   * Runs after a successful checkout → `/api/checkout` sync (e.g. refetch `/api/users`
   * subscription fields). `router.refresh()` always runs first for RSC payloads.
   */
  onAfterPurchaseSync?: () => void | Promise<void>;
}) {
  const { checkout, children, onAfterPurchaseSync } = props;
  const router = useRouter();

  const onAfterSync = React.useCallback(() => {
    router.refresh();
    void onAfterPurchaseSync?.();
  }, [router, onAfterPurchaseSync]);

  return (
    <CheckoutProvider
      onAfterSync={onAfterSync}
      checkout={checkout}
      endpoint={`${process.env.NEXT_PUBLIC_APP_URL}/api/checkout`}
    >
      {children}
    </CheckoutProvider>
  );
}
