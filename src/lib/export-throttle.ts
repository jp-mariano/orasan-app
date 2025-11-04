import { createClient } from '@/lib/supabase/server';

/**
 * Throttling configuration for data exports
 */
export const EXPORT_THROTTLE_CONFIG = {
  // Maximum number of exports allowed per time window
  maxExports: 3,
  // Time window in hours
  timeWindowHours: 24,
} as const;

/**
 * Result of throttling check
 */
export interface ThrottleResult {
  allowed: boolean;
  retryAfter?: Date;
  remainingExports?: number;
  error?: string;
}

/**
 * Checks if a user is allowed to export data based on recent export activity
 * Uses the activity log to track EXPORT_DATA actions
 *
 * @param userId - The ID of the user requesting the export
 * @returns Promise with throttling result including retry information
 */
export async function checkExportThrottle(
  userId: string
): Promise<ThrottleResult> {
  try {
    const supabase = await createClient();

    // Calculate the time window start (24 hours ago)
    const timeWindowStart = new Date();
    timeWindowStart.setHours(
      timeWindowStart.getHours() - EXPORT_THROTTLE_CONFIG.timeWindowHours
    );

    // Query activity log for recent EXPORT_DATA actions
    const { data: recentExports, error } = await supabase
      .from('user_activity_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('action', 'EXPORT_DATA')
      .gte('created_at', timeWindowStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking export throttle:', error);
      // On error, allow the export (fail open) but log the error
      return { allowed: true };
    }

    const exportCount = recentExports?.length || 0;

    // Check if user has exceeded the limit
    if (exportCount >= EXPORT_THROTTLE_CONFIG.maxExports) {
      // Find the oldest export in the current window to calculate retry time
      const oldestExport = recentExports?.[recentExports.length - 1];
      if (oldestExport?.created_at) {
        const oldestExportDate = new Date(oldestExport.created_at);
        const retryAfter = new Date(oldestExportDate);
        retryAfter.setHours(
          retryAfter.getHours() + EXPORT_THROTTLE_CONFIG.timeWindowHours
        );

        return {
          allowed: false,
          retryAfter,
          remainingExports: 0,
          error: `You have reached the limit of ${EXPORT_THROTTLE_CONFIG.maxExports} exports per ${EXPORT_THROTTLE_CONFIG.timeWindowHours} hours. Please try again later.`,
        };
      }

      return {
        allowed: false,
        remainingExports: 0,
        error: `You have reached the limit of ${EXPORT_THROTTLE_CONFIG.maxExports} exports per ${EXPORT_THROTTLE_CONFIG.timeWindowHours} hours.`,
      };
    }

    // User is within limits
    const remainingExports = EXPORT_THROTTLE_CONFIG.maxExports - exportCount;

    return {
      allowed: true,
      remainingExports,
    };
  } catch (error) {
    console.error('Error in checkExportThrottle:', error);
    // On error, allow the export (fail open) but log the error
    return { allowed: true };
  }
}
