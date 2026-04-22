import Link from 'next/link';

import { OperatorContactCard } from '@/components/legal/operator-contact-card';
import { Header } from '@/components/ui/header';

export const metadata = {
  title: 'License | Orasan',
  description: 'Orasan is released under the MIT License.',
};

export default function LicensePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">License</h1>
        <p className="text-gray-600 mb-8">
          The Orasan application source code is provided under the MIT License.
          See the{' '}
          <code className="text-sm bg-gray-100 px-1 rounded">LICENSE</code> file
          in the project repository for the full text. You may also refer to{' '}
          <a
            href="https://opensource.org/licenses/MIT"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            the OSI summary of the MIT License
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Use of a hosted service may include separate terms (see{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
          ).
        </p>

        <h2 className="text-lg font-semibold text-gray-900 mt-10 mb-3">
          Service operator
        </h2>
        <OperatorContactCard />

        <nav className="mt-12 pt-8 border-t text-sm text-muted-foreground">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
        </nav>
      </main>
    </div>
  );
}
