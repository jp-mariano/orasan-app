import Link from 'next/link';

import { OperatorContactCard } from '@/components/legal/operator-contact-card';
import { Header } from '@/components/ui/header';

export const metadata = {
  title: 'Terms of Service | Orasan',
  description:
    'Terms governing your use of the Orasan time tracking application.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
        <p className="text-sm text-muted-foreground mb-2">
          Last updated: April 2026
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          These terms govern your access to and use of the Orasan web
          application (the &quot;Service&quot;). By using the Service, you agree
          to these terms. The party operating the production deployment (the
          &quot;Operator&quot;) is identified in the <strong>Contact</strong>{' '}
          section at the end of this page when we publish contact details for
          this site. This document is for clarity and is not a substitute for
          legal advice.
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-800">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. The Service
            </h2>
            <p>
              Orasan provides time tracking, project and task management, work
              sessions, invoicing features (where enabled), and related tools.
              We may change, suspend, or discontinue features with reasonable
              notice where practical.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Eligibility and accounts
            </h2>
            <p>
              You must provide accurate information and keep your credentials
              secure. You are responsible for activity under your account. You
              may sign in using supported OAuth providers; their terms also
              apply to that sign-in method.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. Free and Pro subscription
            </h2>
            <p>
              The Service may be offered in tiers (e.g. Free and Pro). Features,
              limits, and prices are as described in the app or on the
              Operator&apos;s pricing page. Pro subscriptions, checkout, and
              billing may be processed by a third party such as{' '}
              <strong>Freemius</strong>; payment and subscription terms on that
              platform also apply. If you cancel Pro or downgrade, you may lose
              access to Pro-only features according to the then-current policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Free tier limitations
            </h2>
            <p>
              The Free tier may limit how many projects you can edit at once,
              which invoice actions you can perform, and other capabilities. The
              app enforces these rules in the product and, where applicable, via
              the API. See the README or in-app help for the current rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Your content
            </h2>
            <p>
              You retain rights to the data and content you submit. You grant
              the Operator a limited license to host, process, and display that
              content as needed to run the Service for you. You represent that
              you have the rights to the content you provide and that it does
              not violate these terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              6. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Use the Service in violation of any law or third-party rights;
              </li>
              <li>
                Attempt to gain unauthorized access to the Service, other
                users&apos; data, or underlying systems;
              </li>
              <li>Introduce malware, abuse APIs, or overload the Service;</li>
              <li>Scrape or resell the Service in bulk without permission;</li>
              <li>Misuse support channels or harass staff or other users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              7. Disclaimers
            </h2>
            <p>
              The Service is provided <strong>as is</strong> and{' '}
              <strong>as available</strong>, without warranties of any kind,
              express or implied, including merchantability, fitness for a
              particular purpose, and non-infringement. We do not warrant
              uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              8. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, the Operator and its
              suppliers will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or for loss of profits, data,
              or goodwill. The aggregate liability for any claim related to the
              Service is limited to the amount you paid to the Operator for the
              Service in the twelve (12) months before the event (or, if nothing
              was paid, fifty dollars (USD) or the minimum amount allowed by
              law).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              9. Termination and account deletion
            </h2>
            <p>
              You may stop using the Service at any time. The Operator may
              suspend or terminate access for violation of these terms or for
              operational reasons. The Service may offer account deletion;
              completion of deletion may be subject to subscription state and
              technical processes described in the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              10. Governing law
            </h2>
            <p>
              These terms are subject to the laws applicable to the
              Operator&apos;s place of business, without regard to
              conflict-of-law rules, unless mandatory consumer rules in your
              country say otherwise. Courts in that jurisdiction have exclusive
              venue, to the extent permitted by law. If any provision is
              unenforceable, the remainder remains in effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Changes</h2>
            <p>
              We may update these terms. The &quot;Last updated&quot; date will
              change. Material changes may be communicated in-app or by email.
              Continued use after the effective date may constitute acceptance,
              as allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="mb-4">
              For questions about these terms, use the operator contact
              information below for this deployment.
            </p>
            <OperatorContactCard />
          </section>
        </div>

        <nav className="mt-12 pt-8 border-t text-sm text-muted-foreground flex flex-wrap gap-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </nav>
      </main>
    </div>
  );
}
