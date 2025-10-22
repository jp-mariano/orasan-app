import { Inter } from 'next/font/google';

import type { Metadata, Viewport } from 'next';

import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { TimeTrackingProvider } from '@/contexts/time-tracking-context';
import { WorkSessionProvider } from '@/contexts/work-session-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Orasan - Time Tracking App',
  description:
    'Track your time, manage projects, and boost productivity with Orasan - the Filipino-inspired time tracking app for freelancers.',
  keywords: 'time tracking, project management, freelancer tools, productivity',
  authors: [{ name: 'Orasan Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <TimeTrackingProvider>
            <WorkSessionProvider>
              <div className="min-h-screen bg-background">{children}</div>
            </WorkSessionProvider>
          </TimeTrackingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
