import { Inter } from 'next/font/google';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';

import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { TimeTrackingProvider } from '@/contexts/time-tracking-context';
import { WorkSessionProvider } from '@/contexts/work-session-context';
import { getPublicSiteUrl } from '@/lib/site-url';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Orasan - Time Tracking App',
    template: '%s | Orasan',
  },
  description:
    'Track your time, manage projects, and boost productivity with Orasan - the Filipino-inspired time tracking app for freelancers.',
  keywords: 'time tracking, project management, freelancer tools, productivity',
  authors: [{ name: 'Orasan Team' }],
  openGraph: {
    siteName: 'Orasan',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Orasan - Time Tracking App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
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
              <Analytics />
            </WorkSessionProvider>
          </TimeTrackingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
