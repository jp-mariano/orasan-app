'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

/** Auth-aware call-to-action rendered inside the hero section. */
export function HomeCTA() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      {user ? (
        <Link href="/dashboard">
          <Button size="lg" className="text-lg px-8 py-6">
            Go to Dashboard
          </Button>
        </Link>
      ) : (
        <Link href="/auth/register">
          <Button size="lg" className="text-lg px-8 py-6">
            Start for Free
          </Button>
        </Link>
      )}
    </div>
  );
}
