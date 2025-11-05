import { NextRequest, NextResponse } from 'next/server';

import { sendDeletionWarningEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Account cleanup cron job
 * Runs daily to:
 * 1. Cancel expired deletion requests (token expired > 24 hours)
 * 2. Delete accounts confirmed > 7 days ago
 * 3. Clean up expired deletion tokens
 * 4. Send 24-hour warning emails (6 days after confirmation)
 *
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET is not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    // Check authorization header (Vercel Cron sends: Authorization: Bearer <CRON_SECRET>)
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Step 1: Find all users with deletion_requested_at populated
    const { data: usersWithDeletion, error: fetchError } = await supabase
      .from('users')
      .select(
        'id, email, name, deletion_requested_at, deletion_token_expires_at, deletion_confirmed_at'
      )
      .not('deletion_requested_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching users for cleanup:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    let expiredTokensCancelled = 0;
    let accountsDeleted = 0;
    let warningsSent = 0;

    // Process users if any are pending deletion
    if (usersWithDeletion && usersWithDeletion.length > 0) {
      // Process each user
      for (const user of usersWithDeletion) {
        // Step 2: Check if deletion_token_expires_at exists and is expired
        if (user.deletion_token_expires_at) {
          const tokenExpiresAt = new Date(user.deletion_token_expires_at);
          if (now > tokenExpiresAt) {
            // Token expired - cancel deletion (indirect cancellation)
            const { error: cancelError } = await supabase
              .from('users')
              .update({
                deletion_requested_at: null,
                deletion_confirmed_at: null,
                deletion_token: null,
                deletion_token_expires_at: null,
              })
              .eq('id', user.id);

            if (cancelError) {
              console.error(
                `Error cancelling expired deletion for user ${user.id}:`,
                cancelError
              );
            } else {
              // Log the indirect cancellation activity
              await supabase.from('user_activity_log').insert({
                user_id: user.id,
                action: 'CANCEL_ACCOUNT_DELETION',
                entity_type: 'account_deletion',
                entity_id: null,
              });
              expiredTokensCancelled++;
              continue; // Early return for this user
            }
          } else {
            // Token not expired yet - do nothing
            continue; // Early return for this user
          }
        }

        // Step 3: Check if deletion_confirmed_at exists
        if (user.deletion_confirmed_at) {
          const confirmedAt = new Date(user.deletion_confirmed_at);
          const daysSinceConfirmation =
            (now.getTime() - confirmedAt.getTime()) / (1000 * 60 * 60 * 24);

          // Check if 7 days have passed (account deletion time)
          if (daysSinceConfirmation >= 7) {
            // Delete user from auth.users (this will cascade delete all related data)
            // Note: A database trigger automatically sets user_deleted_at on activity logs before user deletion
            const { error: deleteError } = await supabase.auth.admin.deleteUser(
              user.id
            );

            if (deleteError) {
              console.error(`Error deleting user ${user.id}:`, deleteError);
            } else {
              accountsDeleted++;
            }
            continue; // Early return for this user
          }

          // Check if 6 days have passed (24 hours before deletion - send warning)
          if (daysSinceConfirmation >= 6) {
            // Check if warning was already sent today (avoid duplicates)
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            const { data: recentWarning } = await supabase
              .from('user_activity_log')
              .select('id')
              .eq('user_id', user.id)
              .eq('action', 'UPDATE')
              .eq('entity_type', 'account_deletion')
              .gte('created_at', todayStart.toISOString())
              .limit(1)
              .single();

            // Only send if warning hasn't been sent today
            if (!recentWarning && user.email) {
              const baseUrl =
                process.env.NODE_ENV === 'production'
                  ? process.env.NEXT_PUBLIC_APP_URL
                  : 'http://localhost:3000';
              const cancellationLink = `${baseUrl}/user-settings`;

              const emailResult = await sendDeletionWarningEmail(
                user.email,
                user.name || user.email,
                cancellationLink
              );

              if (emailResult.success) {
                // Log the warning email as an activity
                await supabase.from('user_activity_log').insert({
                  user_id: user.id,
                  action: 'UPDATE',
                  entity_type: 'account_deletion',
                  entity_id: null,
                });
                warningsSent++;
              } else {
                console.error(
                  `Failed to send warning email to user ${user.id}:`,
                  emailResult.error
                );
              }
            }
          }
        }
      }
    }

    // Clean up activity logs older than 1 year after user deletion
    // This runs independently of user deletion processing
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { error: logCleanupError } = await supabase
      .from('user_activity_log')
      .delete()
      .not('user_deleted_at', 'is', null)
      .lt('user_deleted_at', oneYearAgo.toISOString());

    if (logCleanupError) {
      console.error('Error cleaning up old activity logs:', logCleanupError);
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      stats: {
        expiredTokensCancelled,
        accountsDeleted,
        warningsSent,
        totalProcessed: usersWithDeletion?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in account cleanup cron:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
