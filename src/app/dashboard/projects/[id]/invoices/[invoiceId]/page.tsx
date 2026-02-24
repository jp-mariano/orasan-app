'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { Download } from 'lucide-react';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/hooks/useUser';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { formatDate } from '@/lib/utils';
import { InvoiceWithDetails } from '@/types';

function formatRateType(rateType: string | null | undefined): string {
  if (!rateType) return '—';
  const s = String(rateType).toLowerCase();
  if (s === 'hourly') return 'Hourly';
  if (s === 'fixed') return 'Fixed';
  if (s === 'monthly') return 'Monthly';
  return rateType;
}

export default function InvoiceDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { user: profile } = useUser();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }
    if (!user) return;

    let cancelled = false;
    async function fetchInvoice() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Invoice not found');
            return;
          }
          setError('Failed to load invoice');
          return;
        }
        const data = await res.json();
        const inv = data.invoice as InvoiceWithDetails;
        if (cancelled) return;
        setInvoice(inv);
        setProjectName(inv.project?.name ?? '');
        // If invoice belongs to a different project than the URL, redirect to correct project
        if (inv.project_id && inv.project_id !== projectId) {
          router.replace(
            `/dashboard/projects/${inv.project_id}/invoices/${invoiceId}`
          );
        }
      } catch {
        if (!cancelled) setError('Failed to load invoice');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchInvoice();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router, invoiceId, projectId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-6">
          <p className="text-muted-foreground">Loading invoice…</p>
        </main>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-6">
          <p className="text-destructive">{error ?? 'Invoice not found'}</p>
          <Button variant="link" asChild className="mt-2 pl-0">
            <Link href={`/dashboard/projects/${projectId}`}>
              Back to project
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  const currencyCode = invoice.currency_code ?? 'USD';
  const project = invoice.project;
  const clientName = project?.client_name || project?.name || '—';
  const clientEmail = project?.client_email ?? '';
  const clientAddress = project?.client_address ?? '';
  const clientPhone = project?.client_phone ?? '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: projectName, href: `/dashboard/projects/${projectId}` },
            { label: 'Invoices', href: `/dashboard/projects/${projectId}` },
            {
              label: `Invoice ${invoice.invoice_number}`,
              href: `/dashboard/projects/${projectId}/invoices/${invoiceId}`,
            },
          ]}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
            <p className="text-muted-foreground">
              {profile?.business_name || '—'}
            </p>
            {profile?.business_email && (
              <p className="text-sm text-muted-foreground">
                {profile.business_email}
              </p>
            )}
          </div>
          <Button asChild>
            <a
              href={`/api/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill To</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{clientName}</p>
              {clientEmail && (
                <p className="text-muted-foreground">{clientEmail}</p>
              )}
              {clientAddress && (
                <p className="text-muted-foreground whitespace-pre-line">
                  {clientAddress}
                </p>
              )}
              {clientPhone && (
                <p className="text-muted-foreground">{clientPhone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Invoice number:</span>{' '}
                {invoice.invoice_number}
              </p>
              <p>
                <span className="text-muted-foreground">Issue date:</span>{' '}
                {formatDate(invoice.issue_date)}
              </p>
              <p>
                <span className="text-muted-foreground">Due date:</span>{' '}
                {invoice.due_date ? formatDate(invoice.due_date) : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Payment terms:</span>{' '}
                {invoice.payment_terms ?? '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Name</th>
                    <th className="text-right py-2 font-medium">Quantity</th>
                    <th className="text-right py-2 font-medium">Rate type</th>
                    <th className="text-right py-2 font-medium">Unit cost</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items ?? []).map(item => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">
                        {formatRateType(item.rate_type ?? null)}
                      </td>
                      <td className="py-2 text-right">
                        {formatPriceWithCurrency(item.unit_cost, currencyCode)}
                      </td>
                      <td className="py-2 text-right">
                        {formatPriceWithCurrency(item.total_cost, currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <dl className="w-full max-w-[240px] space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>
                    {formatPriceWithCurrency(invoice.subtotal, currencyCode)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Tax ({invoice.tax_rate ?? 0}%)
                  </dt>
                  <dd>
                    {formatPriceWithCurrency(
                      invoice.tax_amount ?? 0,
                      currencyCode
                    )}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <dt>Total</dt>
                  <dd>
                    {formatPriceWithCurrency(
                      invoice.total_amount,
                      currencyCode
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {invoice.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
