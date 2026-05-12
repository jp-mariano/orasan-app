import { Suspense } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Clock, FileText, FolderOpen, Shield, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

import { GoBackUpButton } from '@/components/go-back-up-button';
import { HomeCTA } from '@/components/home/home-cta';
import { HomeErrorBanner } from '@/components/home/home-error-banner';
import { Header } from '@/components/ui/header';
import { getPublicSiteUrl } from '@/lib/site-url';

const siteUrl = getPublicSiteUrl();
const repositoryUrl = process.env.NEXT_PUBLIC_APP_REPOSITORY_URL?.trim();
const xUrl = process.env.NEXT_PUBLIC_APP_X_URL?.trim();

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Orasan',
      url: siteUrl,
      description:
        'Time tracking application designed for freelancers. Manage projects, track tasks, and create invoices.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#app`,
      name: 'Orasan',
      url: siteUrl,
      description:
        'Track your time, manage projects, and boost productivity with Orasan — the time tracking app built for freelancers.',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: [
        {
          '@type': 'Offer',
          name: 'Free',
          price: '0',
          priceCurrency: 'USD',
          description: 'Core time tracking and project management',
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '3.33',
          priceCurrency: 'USD',
          description: 'Invoicing, PDF export, and unlimited project writes',
        },
      ],
      featureList: [
        'Time tracking',
        'Project management',
        'Task management',
        'Work session summaries',
        'Data export',
        'Invoice creation (Pro)',
        'PDF invoice export (Pro)',
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: 'Orasan - Time Tracking for Freelancers',
  description:
    'Track your time, manage projects, and boost productivity with Orasan - the Filipino-inspired time tracking app for freelancers.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Orasan - Time Tracking for Freelancers',
    description:
      'Track your time, manage projects, and boost productivity with Orasan - the Filipino-inspired time tracking app for freelancers.',
    url: '/',
    type: 'website',
  },
  twitter: {
    title: 'Orasan - Time Tracking for Freelancers',
    description:
      'Track your time, manage projects, and boost productivity with Orasan - the Filipino-inspired time tracking app for freelancers.',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main>
          {/* Hero Section */}
          <section
            aria-label="Intro"
            className="flex min-h-[calc(100dvh-5rem)] flex-col justify-center"
          >
            <div className="container mx-auto px-4 py-20 sm:px-6 md:py-28 lg:px-8 lg:py-32">
              {/* Error banner — client only, needs useSearchParams */}
              <Suspense>
                <HomeErrorBanner />
              </Suspense>

              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                  Track Time,{' '}
                  <span className="text-blue-600">Boost Productivity</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Orasan is a time tracking application designed for
                  freelancers. Manage projects, track tasks, and stay productive
                  in a clear, simple workflow.
                </p>
                {/* CTA — client only, needs useAuth */}
                <HomeCTA />
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12 md:py-16">
            {/* Product screenshots */}
            <section className="mb-0" aria-labelledby="product-preview-heading">
              <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-600/90 mb-3">
                  See it in action
                </p>
                <h2
                  id="product-preview-heading"
                  className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900"
                >
                  Built for real client work
                </h2>
                <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                  From your day-to-day dashboard to Pro invoice previews and
                  PDFs, here is what the app looks like inside.
                </p>
              </div>

              <div className="max-w-5xl mx-auto flex flex-col gap-20 md:gap-28">
                <figure className="m-0 flex flex-col">
                  <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100/90 p-1 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70">
                    <div className="overflow-hidden rounded-[0.875rem] bg-slate-200/30">
                      <Image
                        src="/Dashboard_Screenshot.png"
                        alt="Orasan dashboard with projects, tasks, and time tracking"
                        width={2520}
                        height={1350}
                        className="w-full h-auto"
                        priority
                        sizes="(max-width: 1280px) 100vw, 1024px"
                      />
                    </div>
                  </div>
                  <figcaption className="mt-6 md:mt-7 text-center px-1 max-w-lg mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Your dashboard at a glance
                    </h3>
                    <p className="mt-2.5 text-sm text-gray-600 leading-relaxed">
                      Projects and timers in one place so you always know what
                      is running and what to tackle next.
                    </p>
                  </figcaption>
                </figure>

                <figure className="m-0 flex flex-col">
                  <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100/90 p-1 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70">
                    <div className="overflow-hidden rounded-[0.875rem] bg-slate-200/30">
                      <Image
                        src="/Invoice_Preview_Screenshot.png"
                        alt="Orasan Pro invoice preview with line items and totals"
                        width={2520}
                        height={1350}
                        className="w-full h-auto"
                        sizes="(max-width: 1280px) 100vw, 1024px"
                      />
                    </div>
                  </div>
                  <figcaption className="mt-6 md:mt-7 text-center px-1 max-w-lg mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Invoices and PDFs (Pro)
                    </h3>
                    <p className="mt-2.5 text-sm text-gray-600 leading-relaxed">
                      Preview line items, tax rate, and totals, then share a
                      client-ready PDF when you are on Pro.
                    </p>
                  </figcaption>
                </figure>
              </div>
            </section>

            {/* Features */}
            <section
              id="features"
              className="mt-20 md:mt-24"
              aria-labelledby="features-heading"
            >
              <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-600/90 mb-3">
                  Under the hood
                </p>
                <h2
                  id="features-heading"
                  className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900"
                >
                  Features that fit freelancing
                </h2>
                <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                  Time tracking, projects, and Pro invoicing in one place, with
                  privacy and subscription options that match how you work.
                </p>
              </div>

              <ul
                className="max-w-3xl mx-auto list-none space-y-8 md:space-y-9 p-0 m-0"
                role="list"
              >
                <li className="flex gap-4 sm:gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100/90 ring-1 ring-purple-200/50 shadow-sm"
                    aria-hidden
                  >
                    <Shield
                      className="h-6 w-6 text-purple-600"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Privacy First
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                      Your data is protected with row-level security. Full
                      control over your information.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 sm:gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100/90 ring-1 ring-green-200/50 shadow-sm"
                    aria-hidden
                  >
                    <FolderOpen
                      className="h-6 w-6 text-green-600"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Project Management
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                      Organize your work with projects and tasks. Set hourly
                      rates and track client work efficiently.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 sm:gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100/90 ring-1 ring-blue-200/50 shadow-sm"
                    aria-hidden
                  >
                    <Clock className="h-6 w-6 text-blue-600" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Smart Time Tracking
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                      Start, stop, and pause timers with ease. Track time spent
                      on tasks automatically.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 sm:gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100/90 ring-1 ring-amber-200/50 shadow-sm"
                    aria-hidden
                  >
                    <Sparkles
                      className="h-6 w-6 text-amber-600"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Core Features Included for Free
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                      Start timers, manage projects and tasks, view work
                      sessions, and export your time data. The everyday workflow
                      is free to use. No card required to get going.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 sm:gap-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100/90 ring-1 ring-orange-200/50 shadow-sm"
                    aria-hidden
                  >
                    <FileText
                      className="h-6 w-6 text-orange-600"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Invoices (Pro)
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-gray-600 leading-relaxed">
                      Turn completed work into line items, preview, and download
                      client-ready PDF invoices.
                    </p>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </main>

        <GoBackUpButton />

        {/* Footer */}
        <footer className="border-t bg-white/80 backdrop-blur-sm mt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-gray-600 text-sm space-y-2">
              <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                {repositoryUrl ? (
                  <a
                    href={repositoryUrl}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source code
                  </a>
                ) : null}
                <Link href="/license" className="text-blue-600 hover:underline">
                  License
                </Link>
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                {xUrl ? (
                  <a
                    href={xUrl}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Follow us on X
                  </a>
                ) : null}
              </p>
              <p>
                &copy; 2026 Orasan. Built with ❤️ for freelancers everywhere.
              </p>
              <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
                <span className="font-medium text-gray-600">
                  AI-assisted development:
                </span>{' '}
                We use AI for brainstorming and debugging, but all final code is
                human-reviewed.
              </p>
              <p className="flex justify-center pt-2 gap-4">
                <a
                  href="https://www.producthunt.com/products/orasan?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-orasan"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Product Hunt SVG badge */}
                  <img
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1131309&amp;theme=neutral&amp;t=1777528232162"
                    alt="Orasan - Time tracking web application built for freelancers | Product Hunt"
                    style={{ height: '54px', width: 'auto' }}
                  />
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
