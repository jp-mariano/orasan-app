'use client';

import Link from 'next/link';

import { User, LogOut, LayoutDashboard, UserPen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PauseTimersModal } from '@/components/ui/pause-timers-modal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
          <span className="text-2xl font-bold text-gray-900">Orasan</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {/* Authentication buttons */}
          {user ? (
            // Authenticated user
            <div className="flex items-center space-x-4">
              {/* User Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900 p-2"
                    disabled={isSigningOut}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-1">
                    <Link href="/dashboard">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/user-settings">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      >
                        <UserPen className="mr-2 h-4 w-4" />
                        User Settings
                      </Button>
                    </Link>
                    <Button
                      onClick={handleSignOut}
                      variant="ghost"
                      size="sm"
                      disabled={isSigningOut}
                      className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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
