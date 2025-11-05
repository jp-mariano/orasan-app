import { createClient } from '@/lib/supabase/client';

/**
 * Handles unauthorized errors by signing out the user and redirecting to sign-in
 * This should be called when a 401 or 403 error is detected from API calls
 */
export async function handleUnauthorizedError() {
  const supabase = createClient();

  // Sign out the user
  await supabase.auth.signOut();

  // Redirect to sign-in page
  window.location.href = '/auth/signin';
}

/**
 * Checks if a response is unauthorized and handles it if so
 * @param response - The fetch Response object
 * @returns true if unauthorized error was handled, false otherwise
 */
export async function checkAndHandleUnauthorized(
  response: Response
): Promise<boolean> {
  if (response.status === 401 || response.status === 403) {
    await handleUnauthorizedError();
    return true;
  }
  return false;
}
