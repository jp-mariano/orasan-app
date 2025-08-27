'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface HeaderProps {
  onSignOut?: () => void; // Custom sign out handler (optional)
  isSigningOut?: boolean; // Whether to show signing out state
  onForceSignOut?: () => void; // Force sign out handler (optional)
  showWelcome?: boolean; // Whether to show welcome message (default: false)
}

export function Header({
  onSignOut,
  isSigningOut,
  onForceSignOut,
  showWelcome = false,
}: HeaderProps) {
  const { user, signOut, manualSignOut } = useAuth();

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
      return;
    }

    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed, using manual fallback:', error);
      manualSignOut();
    }
  };

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
              {showWelcome && (
                <span className="text-gray-600">
                  Welcome,{' '}
                  {user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email}
                </span>
              )}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </Button>
              {isSigningOut && onForceSignOut && (
                <Button
                  onClick={onForceSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Force Sign Out
                </Button>
              )}
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
    </header>
  );
}
