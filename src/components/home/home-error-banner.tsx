'use client';

import { useSearchParams } from 'next/navigation';

import { useErrorDisplay } from '@/hooks/useErrorDisplay';

/**
 * Reads the `?error=` search param and renders an error banner (non-critical)
 * or a full-page error display (critical). Returns null when there is no error.
 * Must be wrapped in <Suspense> by the parent because it calls useSearchParams.
 */
export function HomeErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'general', fallbackToInline: true });

  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
  }

  if (!inlineErrorMessage) return null;

  return (
    <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
      {inlineErrorMessage}
    </div>
  );
}
