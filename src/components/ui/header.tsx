'use client';

import Link from 'next/link';

import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PauseTimersModal } from '@/components/ui/pause-timers-modal';
import { useAuth } from '@/contexts/auth-context';
import { useSignOutWithTimerCheck } from '@/hooks/useSignOutWithTimerCheck';

export function Header() {
  const { user, isSigningOut, signOut } = useAuth();

  // Sign out with timer check
  const {
    handleSignOut,
    showPauseTimersModal,
    setShowPauseTimersModal,
    isPausingAll,
    handlePauseAll,
    handleCancelPause,
  } = useSignOutWithTimerCheck({
    onSignOut: async () => {
      // Call the actual signOut function from auth context
      await signOut();
    },
  });

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-2">
          <Clock className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">Orasan</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {/* Authentication buttons */}
          {user ? (
            // Authenticated user
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                disabled={isSigningOut}
                className="text-gray-600 hover:text-gray-900"
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
            </div>
          ) : (
            // Unauthenticated user
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Pause Timers Modal for Sign Out */}
      <PauseTimersModal
        open={showPauseTimersModal}
        onOpenChange={setShowPauseTimersModal}
        title="Pause All Running Timers Before Sign Out"
        description="You have running timers. Would you like to pause them before signing out?"
        confirmText="Pause All & Sign Out"
        cancelText="Cancel"
        onConfirm={handlePauseAll}
        onCancel={handleCancelPause}
        isLoading={isPausingAll}
      />
    </header>
  );
}
