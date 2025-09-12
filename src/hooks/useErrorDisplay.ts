import React from 'react';

import { useRouter } from 'next/navigation';

import { ErrorDisplay } from '@/components/ui/error-display';
import {
  ErrorContext,
  ErrorDisplayConfig,
  getErrorDisplayConfig,
  isCriticalError,
  getInlineErrorMessage,
} from '@/lib/error-utils';

interface UseErrorDisplayOptions {
  context?: ErrorContext;
  fallbackToInline?: boolean;
}

interface UseErrorDisplayReturn {
  shouldShowErrorDisplay: boolean;
  ErrorDisplayComponent: React.ComponentType | null;
  inlineErrorMessage: string;
}

/**
 * Hook for handling error display logic with ErrorDisplay component
 *
 * @param error - The error message to display
 * @param options - Configuration options
 * @returns Object with error display logic and components
 */
export const useErrorDisplay = (
  error: string | null | undefined,
  options: UseErrorDisplayOptions = {}
): UseErrorDisplayReturn => {
  const router = useRouter();
  const { context = 'general', fallbackToInline = true } = options;

  // If no error, return null components
  if (!error) {
    return {
      shouldShowErrorDisplay: false,
      ErrorDisplayComponent: null,
      inlineErrorMessage: '',
    };
  }

  // Check if error is critical
  const isCritical = isCriticalError(error, context);

  // If critical error, return ErrorDisplay component
  if (isCritical) {
    const config: ErrorDisplayConfig = getErrorDisplayConfig(
      error,
      context,
      router
    );

    const ErrorDisplayComponent: React.ComponentType = () => {
      return React.createElement(ErrorDisplay, {
        title: config.title,
        message: config.message,
        onBack: config.onBack,
        backLabel: config.backLabel,
      });
    };

    return {
      shouldShowErrorDisplay: true,
      ErrorDisplayComponent,
      inlineErrorMessage: '',
    };
  }

  // If non-critical error and fallback is enabled, return inline error message
  if (fallbackToInline) {
    const inlineErrorMessage = getInlineErrorMessage(error, context);

    return {
      shouldShowErrorDisplay: false,
      ErrorDisplayComponent: null,
      inlineErrorMessage,
    };
  }

  // If non-critical error and no fallback, return null
  return {
    shouldShowErrorDisplay: false,
    ErrorDisplayComponent: null,
    inlineErrorMessage: '',
  };
};

/**
 * Simplified hook for just checking if an error should show ErrorDisplay
 *
 * @param error - The error message to check
 * @param context - The error context
 * @returns boolean indicating if ErrorDisplay should be shown
 */
export const useIsCriticalError = (
  error: string | null | undefined,
  context: ErrorContext = 'general'
): boolean => {
  if (!error) return false;
  return isCriticalError(error, context);
};

/**
 * Hook for getting inline error message for non-critical errors
 *
 * @param error - The error message
 * @param context - The error context
 * @returns User-friendly inline error message
 */
export const useInlineErrorMessage = (
  error: string | null | undefined,
  context: ErrorContext = 'general'
): string => {
  if (!error) return '';

  return getInlineErrorMessage(error, context);
};
