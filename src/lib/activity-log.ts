import { createClient } from '@/lib/supabase/server';
import { ActivityAction, ActivityEntityType } from '@/types';

/**
 * Logs a user activity to the user_activity_log table
 * This function is designed to be called from API routes where we have an authenticated user
 *
 * @param userId - The ID of the user performing the action
 * @param action - The action being performed (CREATE, UPDATE, DELETE, etc.)
 * @param entityType - The type of entity being acted upon
 * @param entityId - Optional ID of the specific entity (null for actions like EXPORT_DATA)
 * @returns Promise that resolves to true if logging succeeded, false otherwise
 */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityId: string | null = null
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('user_activity_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
    });

    if (error) {
      // Log error but don't throw - activity logging should not break the main operation
      console.error('Failed to log activity:', {
        userId,
        action,
        entityType,
        entityId,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (error) {
    // Log error but don't throw - activity logging should not break the main operation
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Helper function to log CREATE operations
 */
export async function logCreate(
  userId: string,
  entityType: ActivityEntityType,
  entityId: string
): Promise<boolean> {
  return logActivity(userId, 'CREATE', entityType, entityId);
}

/**
 * Helper function to log UPDATE operations
 */
export async function logUpdate(
  userId: string,
  entityType: ActivityEntityType,
  entityId: string
): Promise<boolean> {
  return logActivity(userId, 'UPDATE', entityType, entityId);
}

/**
 * Helper function to log DELETE operations
 */
export async function logDelete(
  userId: string,
  entityType: ActivityEntityType,
  entityId: string
): Promise<boolean> {
  return logActivity(userId, 'DELETE', entityType, entityId);
}

/**
 * Helper function to log data export requests
 */
export async function logDataExport(userId: string): Promise<boolean> {
  return logActivity(userId, 'EXPORT_DATA', 'data_export', null);
}

/**
 * Helper function to log account deletion requests
 */
export async function logAccountDeletionRequest(
  userId: string
): Promise<boolean> {
  return logActivity(
    userId,
    'REQUEST_ACCOUNT_DELETION',
    'account_deletion',
    null
  );
}

/**
 * Helper function to log account deletion confirmations
 */
export async function logAccountDeletionConfirmation(
  userId: string
): Promise<boolean> {
  return logActivity(
    userId,
    'CONFIRM_ACCOUNT_DELETION',
    'account_deletion',
    null
  );
}

/**
 * Helper function to log account deletion cancellations
 */
export async function logAccountDeletionCancellation(
  userId: string
): Promise<boolean> {
  return logActivity(
    userId,
    'CANCEL_ACCOUNT_DELETION',
    'account_deletion',
    null
  );
}
