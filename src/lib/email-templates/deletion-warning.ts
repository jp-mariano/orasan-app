/**
 * HTML template for 24-hour account deletion warning email
 */
export function createDeletionWarningEmailHtml(
  userName: string,
  cancellationLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Final Account Deletion Notice</h2>
        <p>Hello ${userName || 'User'},</p>
        <p>This is a final reminder that your account will be permanently deleted in <strong>24 hours</strong>.</p>
        
        <div class="warning">
          <strong>⚠️ Important:</strong> All your data will be permanently deleted including:
          <ul>
            <li>All projects and tasks</li>
            <li>All time entries and work sessions</li>
            <li>All invoices and business information</li>
            <li>Your account profile</li>
          </ul>
        </div>
        
        <p>If you want to keep your account, please cancel the deletion request by logging into your account:</p>
        <a href="${cancellationLink}" class="button">Cancel Account Deletion</a>
        
        <p>If you don't take any action, your account and all associated data will be permanently deleted in 24 hours and cannot be recovered.</p>
        
        <div class="footer">
          <p>This is an automated notification. If you have questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
