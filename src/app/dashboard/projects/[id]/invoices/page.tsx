'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { ReceiptText } from 'lucide-react';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { useAuth } from '@/contexts/auth-context';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { formatDate } from '@/lib/utils';
import { Invoice } from '@/types';

export default function ProjectInvoicesPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [projectName, setProjectName] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }
    if (!user || !projectId) return;

    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [projectRes, invoicesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/invoices?project_id=${projectId}`),
        ]);

        if (cancelled) return;

        if (!projectRes.ok) {
          setError('Failed to load project');
          return;
        }
        const projectData = await projectRes.json();
        if (projectData.project?.name) {
          setProjectName(projectData.project.name);
        }

        if (!invoicesRes.ok) {
          setError('Failed to load invoices');
          return;
        }
        const invoicesData = await invoicesRes.json();
        setInvoices(
          Array.isArray(invoicesData.invoices) ? invoicesData.invoices : []
        );
      } catch {
        if (!cancelled) setError('Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router, projectId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            {
              label: projectName || 'Project',
              href: `/dashboard/projects/${projectId}`,
            },
            {
              label: 'Invoices',
              href: `/dashboard/projects/${projectId}/invoices`,
            },
          ]}
          className="mb-6"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Invoices
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Invoices for this project. Click an invoice to view details.
            </p>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground py-6">
                No invoices yet. Create an invoice from the project page using
                the Invoice action in the menu.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">
                        Invoice number
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Issue date
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Due date
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr
                        key={inv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          router.push(
                            `/dashboard/projects/${projectId}/invoices/${inv.id}`
                          )
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(
                              `/dashboard/projects/${projectId}/invoices/${inv.id}`
                            );
                          }
                        }}
                        className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">{inv.invoice_number}</td>
                        <td className="py-3 px-4">
                          {formatDate(inv.issue_date)}
                        </td>
                        <td className="py-3 px-4">
                          {inv.due_date ? formatDate(inv.due_date) : '—'}
                        </td>
                        <td className="py-3 px-4 capitalize">{inv.status}</td>
                        <td className="py-3 px-4 text-right">
                          {formatPriceWithCurrency(
                            inv.total_amount,
                            inv.currency_code ?? 'USD'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
