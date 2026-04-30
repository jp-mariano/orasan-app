'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

import { getTurnstileSiteKey } from '@/lib/turnstile-config';

export type AuthTurnstileHandle = {
  reset: () => void;
};

type AuthTurnstileProps = {
  onToken: (token: string | null) => void;
  className?: string;
};

export const AuthTurnstile = forwardRef<
  AuthTurnstileHandle | null,
  AuthTurnstileProps
>(function AuthTurnstile({ onToken, className }, ref) {
  const innerRef = useRef<TurnstileInstance | undefined>(undefined);
  const siteKey = getTurnstileSiteKey();

  useImperativeHandle(ref, () => ({
    reset: () => {
      innerRef.current?.reset();
    },
  }));

  if (!siteKey) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        Turnstile is not configured. Set{' '}
        <span className="font-mono text-xs">
          NEXT_PUBLIC_TURNSTILE_SITE_KEY
        </span>{' '}
        for production.
      </p>
    );
  }

  return (
    <div className={className}>
      <Turnstile
        ref={innerRef}
        siteKey={siteKey}
        options={{ size: 'flexible' }}
        onSuccess={token => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
});

AuthTurnstile.displayName = 'AuthTurnstile';
