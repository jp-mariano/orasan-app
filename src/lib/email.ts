import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Creates HTML content for account deletion confirmation email
 */
function createDeletionEmailHtml(
  userName: string,
  confirmationLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Confirm Account Deletion</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>You requested to delete your account from our time tracking application.</p>
        
        <div class="warning">
          <strong>⚠️ Warning:</strong> This action will permanently delete all your data including:
          <ul>
            <li>All projects and tasks</li>
            <li>All time entries and work sessions</li>
            <li>All invoices and business information</li>
            <li>Your account profile</li>
          </ul>
        </div>
        
        <p>Click the button below to confirm account deletion:</p>
        <a href="${confirmationLink}" class="button">Confirm Account Deletion</a>
        
        <p><strong>Grace Period:</strong> Your account will be permanently deleted after 7 days. You can cancel this request anytime before then by logging into your account.</p>
        
        <p>If you didn't request this deletion, please ignore this email or contact support.</p>
        
        <div class="footer">
          <p>This email was sent because you requested account deletion. If you have questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

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
      html: createDeletionEmailHtml(userName, confirmationLink),
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
