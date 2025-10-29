import { Resend } from 'resend';

import { createAccountDeletionEmailHtml } from '@/lib/email-templates/deletion-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends account deletion confirmation email
 */
export async function sendDeletionConfirmationEmail(
  to: string,
  userName: string,
  confirmationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { error } = await resend.emails.send({
      from: 'Orasan Notifications <notifications@orasan.app>',
      to: [to],
      subject: 'Confirm Account Deletion - Orasan App',
      html: createAccountDeletionEmailHtml(userName, confirmationLink),
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: 'Failed to send confirmation email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
