import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Error context types
export type ErrorContext = 'auth' | 'data' | 'general';

// Error display configuration
export interface ErrorDisplayConfig {
  title: string;
  message: string;
  backLabel: string;
  onBack: () => void;
}

// Critical error patterns for different contexts
const CRITICAL_PATTERNS = {
  auth: [
    'unauthorized',
    'forbidden',
    'authentication',
    'session expired',
    'access denied',
    'invalid token',
    'token expired',
    'auth_callback_failed',
    'confirmation_failed',
  ],
  data: [
    'database error',
    'internal server error',
    'failed to fetch',
    'connection error',
    'network error',
    'timeout',
    'service unavailable',
    '500',
    '502',
    '503',
    '504',
  ],
  general: [
    'unauthorized',
    'forbidden',
    'network error',
    'database error',
    'internal server error',
    'failed to fetch',
    'connection error',
    'timeout',
    'service unavailable',
    'authentication',
    'session expired',
    'access denied',
  ],
};

/**
 * Determines if an error is critical based on the context
 */
export const isCriticalError = (
  error: string,
  context: ErrorContext = 'general'
): boolean => {
  if (!error) return false;

  const patterns = CRITICAL_PATTERNS[context];
  const errorLower = error.toLowerCase();

  return patterns.some(pattern => errorLower.includes(pattern));
};

/**
 * Gets error display configuration based on error type and context
 */
export const getErrorDisplayConfig = (
  error: string,
  context: ErrorContext = 'general',
  router?: AppRouterInstance
): ErrorDisplayConfig => {
  const errorLower = error.toLowerCase();

  // Auth context errors
  if (context === 'auth') {
    if (
      errorLower.includes('unauthorized') ||
      errorLower.includes('session expired')
    ) {
      return {
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
        backLabel: 'Sign In',
        onBack: () => {
          if (router) {
            router.push('/auth/signin');
          } else {
            window.location.href = '/auth/signin';
          }
        },
      };
    }

    if (errorLower.includes('auth_callback_failed')) {
      return {
        title: 'Authentication Failed',
        message:
          'There was a problem with the authentication process. Please try again.',
        backLabel: 'Try Again',
        onBack: () => {
          if (router) {
            router.push('/auth/signin');
          } else {
            window.location.href = '/auth/signin';
          }
        },
      };
    }

    if (errorLower.includes('confirmation_failed')) {
      return {
        title: 'Email Confirmation Failed',
        message:
          'There was a problem confirming your email. Please try signing in again.',
        backLabel: 'Sign In',
        onBack: () => {
          if (router) {
            router.push('/auth/signin');
          } else {
            window.location.href = '/auth/signin';
          }
        },
      };
    }

    if (
      errorLower.includes('forbidden') ||
      errorLower.includes('access denied')
    ) {
      return {
        title: 'Access Denied',
        message: "You don't have permission to access this resource.",
        backLabel: 'Go Back',
        onBack: () => router?.back() || window.history.back(),
      };
    }
  }

  // Data context errors
  if (context === 'data') {
    if (errorLower.includes('database') || errorLower.includes('500')) {
      return {
        title: 'Service Unavailable',
        message:
          "We're experiencing technical difficulties. Please try again later.",
        backLabel: 'Retry',
        onBack: () => window.location.reload(),
      };
    }

    if (
      errorLower.includes('network') ||
      errorLower.includes('failed to fetch')
    ) {
      return {
        title: 'Connection Error',
        message:
          'Unable to connect to our servers. Please check your internet connection.',
        backLabel: 'Retry',
        onBack: () => window.location.reload(),
      };
    }

    if (errorLower.includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete. Please try again.',
        backLabel: 'Retry',
        onBack: () => window.location.reload(),
      };
    }
  }

  // General context errors (fallback)
  if (errorLower.includes('unauthorized')) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      backLabel: 'Sign In',
      onBack: () => {
        if (router) {
          router.push('/auth/signin');
        } else {
          window.location.href = '/auth/signin';
        }
      },
    };
  }

  if (errorLower.includes('database') || errorLower.includes('500')) {
    return {
      title: 'Service Unavailable',
      message:
        "We're experiencing technical difficulties. Please try again later.",
      backLabel: 'Retry',
      onBack: () => window.location.reload(),
    };
  }

  if (
    errorLower.includes('network') ||
    errorLower.includes('failed to fetch')
  ) {
    return {
      title: 'Connection Error',
      message:
        'Unable to connect to our servers. Please check your internet connection.',
      backLabel: 'Retry',
      onBack: () => window.location.reload(),
    };
  }

  // Default fallback
  return {
    title: 'Something Went Wrong',
    message: error,
    backLabel: 'Retry',
    onBack: () => window.location.reload(),
  };
};

/**
 * Gets a user-friendly error message for display in inline error components
 */
export const getInlineErrorMessage = (
  error: string,
  context: ErrorContext = 'general'
): string => {
  if (!error) return '';

  const errorLower = error.toLowerCase();

  // Auth context messages
  if (context === 'auth') {
    if (errorLower.includes('auth_callback_failed')) {
      return 'Authentication failed. Please try again.';
    }
    if (errorLower.includes('confirmation_failed')) {
      return 'Email confirmation failed. Please try signing in again.';
    }
    if (errorLower.includes('unauthorized')) {
      return 'Your session has expired. Please sign in again.';
    }
  }

  // Data context messages
  if (context === 'data') {
    if (errorLower.includes('database') || errorLower.includes('500')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    if (
      errorLower.includes('network') ||
      errorLower.includes('failed to fetch')
    ) {
      return 'Connection error. Please check your internet connection.';
    }
  }

  // Return original error for non-critical issues
  return error;
};
