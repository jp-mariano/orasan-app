'use client';

import { Suspense, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { SiGithub, SiGoogle } from 'react-icons/si';

import {
  AuthTurnstile,
  type AuthTurnstileHandle,
} from '@/components/auth/auth-turnstile';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useErrorDisplay } from '@/hooks/useErrorDisplay';
import { getTurnstileSiteKey } from '@/lib/turnstile-config';

function LoginPageContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<AuthTurnstileHandle | null>(null);
  const { signIn, signInWithPassword } = useAuth();
  const siteKeyReady = !!getTurnstileSiteKey();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const error = searchParams.get('error');

  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'auth', fallbackToInline: true });

  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
  }

  const destination =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/dashboard';

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    try {
      setFormError(null);
      setIsLoading(provider);
      await signIn(provider);
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err);
      setIsLoading(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.');
      return;
    }
    if (!siteKeyReady || !captchaToken) {
      setFormError(
        siteKeyReady
          ? 'Please complete the verification check below.'
          : 'Sign in is temporarily unavailable.'
      );
      return;
    }
    setIsLoading('email');
    try {
      await signInWithPassword(email, password, captchaToken);
      router.replace(destination);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Sign in failed. Try again.'
      );
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Orasan</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {inlineErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {inlineErrorMessage}
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading !== null}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="signin-password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading !== null}
                required
              />
            </div>
            <AuthTurnstile
              ref={turnstileRef}
              onToken={setCaptchaToken}
              className="flex justify-center min-h-[65px]"
            />
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading !== null || !siteKeyReady || !captchaToken}
            >
              {isLoading === 'email' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign in with email'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading !== null}
              type="button"
            >
              {isLoading === 'github' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <SiGithub className="h-4 w-4 mr-2" />
              )}
              Continue with GitHub
            </Button>

            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading !== null}
              type="button"
            >
              {isLoading === 'google' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <SiGoogle className="h-4 w-4 mr-2" />
              )}
              Continue with Google
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="text-blue-600 hover:underline"
            >
              Sign up
            </Link>
          </div>

          <div className="text-center text-sm text-gray-600">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
