'use client';

import { Suspense, useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfirmationState {
  status: 'loading' | 'success' | 'error' | 'expired';
  message: string;
  details?: string;
}

function ConfirmDeletionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConfirmationState>({
    status: 'loading',
    message: 'Processing your confirmation...',
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const confirmDeletion = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setState({
          status: 'error',
          message: 'Invalid confirmation link',
          details: 'The confirmation link is missing or invalid.',
        });
        return;
      }

      try {
        const response = await fetch('/api/users/confirm-deletion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 400) {
            setState({
              status: 'expired',
              message: 'Confirmation link expired',
              details:
                data.error ||
                'This confirmation link has expired. Please request a new deletion confirmation.',
            });

            // Don't redirect for expired tokens - let user manually navigate
          } else {
            setState({
              status: 'error',
              message: 'Confirmation failed',
              details:
                data.error ||
                'An error occurred while confirming your account deletion.',
            });

            // Don't redirect for errors - let user manually navigate
          }
          return;
        }

        setState({
          status: 'success',
          message: 'Account deletion confirmed',
          details:
            'Your account has been marked for deletion. It will be permanently deleted after the 7-day grace period.',
        });

        // Start countdown for redirect
        setCountdown(10);
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return 0; // Do not navigate here; handled in separate effect
            }
            return prev - 1;
          });
        }, 1000);
      } catch (error) {
        console.error('Confirmation error:', error);
        setState({
          status: 'error',
          message: 'Network error',
          details:
            'Unable to process your confirmation. Please check your internet connection and try again.',
        });
      }
    };

    confirmDeletion();
  }, [searchParams, router]);

  // Redirect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      router.push('/user-settings');
    }
  }, [countdown, router]);

  // Cleanup countdown interval on unmount (interval clears itself when reaching 0)
  useEffect(() => {
    return () => {
      // No-op: interval is cleared within the countdown updater
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Account Deletion Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading State */}
          {state.status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
              <p className="text-gray-600">{state.message}</p>
            </div>
          )}

          {/* Success State */}
          {state.status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-800">
                  {state.message}
                </h3>
                <p className="text-gray-600 text-sm">{state.details}</p>
                {countdown !== null && (
                  <p className="text-blue-600 text-sm font-medium">
                    Redirecting to User Settings in {countdown} seconds...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {state.status === 'error' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-red-800">
                  {state.message}
                </h3>
                <p className="text-gray-600 text-sm">{state.details}</p>
              </div>
              <div className="pt-4">
                <a
                  href="/user-settings"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Go to User Settings
                </a>
              </div>
            </div>
          )}

          {/* Expired State */}
          {state.status === 'expired' && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-yellow-800">
                  {state.message}
                </h3>
                <p className="text-gray-600 text-sm">{state.details}</p>
              </div>
              <div className="pt-4">
                <a
                  href="/user-settings"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Go to User Settings
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmDeletionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Account Deletion Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ConfirmDeletionContent />
    </Suspense>
  );
}
