'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import type { CheckoutSerialized } from '@freemius/sdk';

import { CheckoutProvider } from '@/react-starter/components/checkout-provider';

export default function AppCheckoutProvider(props: {
  children: React.ReactNode;
  checkout: CheckoutSerialized;
}) {
  const router = useRouter();

  const onAfterSync = React.useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <CheckoutProvider
      onAfterSync={onAfterSync}
      checkout={props.checkout}
      endpoint={`${process.env.NEXT_PUBLIC_APP_URL}/api/checkout`}
    >
      {props.children}
    </CheckoutProvider>
  );
}
