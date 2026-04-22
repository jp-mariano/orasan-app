import Link from 'next/link';

import { OperatorContactCard } from '@/components/legal/operator-contact-card';
import { Header } from '@/components/ui/header';

export const metadata = {
  title: 'Privacy Policy | Orasan',
  description: 'How Orasan collects, uses, and protects your information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
        <p className="text-sm text-muted-foreground mb-2">
          Last updated: April 2026
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          This policy describes how Orasan (&quot;we&quot;, &quot;us&quot;)
          handles personal information when you use our time-tracking web
          application. It is provided for transparency and is not legal advice.
          For this deployment, use the <strong>Contact</strong> section at the
          end of this page (when contact details are configured for our
          instance).
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-800">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. Who this applies to
            </h2>
            <p>
              This policy applies to visitors and registered users of the
              service. The data controller is whoever operates the Orasan
              instance you use (e.g. the company or individual running the
              production deployment and Supabase project).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Information we collect
            </h2>
            <p>Depending on how you use Orasan, we may process:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account and profile</strong> — e.g. email, display name,
                and settings you provide (including business and client details
                for invoicing where you choose to store them).
              </li>
              <li>
                <strong>Authentication</strong> — when you sign in with a
                provider (such as Google or GitHub), we receive identifiers that
                provider shares with the app, subject to that provider&apos;s
                terms.
              </li>
              <li>
                <strong>Time and work data</strong> — projects, tasks, time
                entries, work sessions, invoice-related data, and similar
                content you create in the product.
              </li>
              <li>
                <strong>Technical data</strong> — server logs, IP address, and
                similar information typically collected by the hosting and
                database provider for security and operations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. How we use information
            </h2>
            <p>We use the information above to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the service;</li>
              <li>
                Authenticate you and keep your data separated from other users;
              </li>
              <li>
                Process subscriptions and entitlements (where Pro billing is
                enabled);
              </li>
              <li>
                Send service-related or transactional messages (e.g. account or
                billing notices);
              </li>
              <li>
                Comply with law and protect the security and integrity of the
                service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Where data is stored and subprocessors
            </h2>
            <p>
              Orasan is built to run on external infrastructure, typically
              including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Supabase</strong> (or compatible backend) for
                authentication, database storage, and row-level security;
              </li>
              <li>
                <strong>Freemius</strong> (or similar) for checkout, customer
                portal, and subscription management when you purchase or manage
                a Pro plan;
              </li>
              <li>
                <strong>Email delivery</strong> (e.g. Resend) for transactional
                emails the operator configures;
              </li>
              <li>
                <strong>Application hosting</strong> (e.g. Vercel or another
                host) for running the web application.
              </li>
            </ul>
            <p className="mt-2">
              Each of these has its own terms and privacy practices. We
              recommend reviewing their documentation if you need detail on data
              location and transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Data retention and deletion
            </h2>
            <p>
              We keep your data for as long as your account is active and as
              needed to provide the service. You may be able to delete your
              account or request deletion through in-app features (e.g. account
              deletion with confirmation), subject to any legal or billing
              retention requirements the operator must meet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              6. Your choices
            </h2>
            <p>
              Where applicable, you may access, update, or export your data
              through the app (for example, data export in user settings) and
              remove items you control. You may also disconnect OAuth providers
              at the identity provider, though you may need an account session
              to use the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Security</h2>
            <p>
              We use industry-standard practices such as encrypted connections
              (HTTPS) and database row-level security so users can only access
              their own data, where the deployment is configured correctly. No
              method of transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Children</h2>
            <p>
              The service is not directed at children under 18 (or the age
              required in your jurisdiction). We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              9. Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time. The &quot;Last
              updated&quot; date at the top will change when we do. Continued
              use of the service after changes may constitute acceptance,
              depending on applicable law and how we notify you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
            <p className="mb-4">
              For privacy questions, contact the operator of this service using
              the information below. If you use a different Orasan deployment
              (e.g. self-hosted), that deployment&apos;s administrator is the
              appropriate contact.
            </p>
            <OperatorContactCard />
          </section>
        </div>

        <nav className="mt-12 pt-8 border-t text-sm text-muted-foreground flex flex-wrap gap-4">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
        </nav>
      </main>
    </div>
  );
}
