'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { MoreVertical } from 'lucide-react';

import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/hooks/useUser';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { formatDate, escapeCsvValue } from '@/lib/utils';
import { InvoiceWithDetails } from '@/types';

function downloadInvoiceCsv(
  invoice: InvoiceWithDetails,
  currencyCode: string
): void {
  const rows: string[] = [];
  const project = invoice.project;
  const clientName = project?.client_name || project?.name || '—';

  rows.push(
    ['Invoice', escapeCsvValue(invoice.invoice_number ?? '')].join(',')
  );
  rows.push(['Issue date', formatDate(invoice.issue_date)].join(','));
  rows.push(
    ['Due date', invoice.due_date ? formatDate(invoice.due_date) : ''].join(',')
  );
  rows.push(
    ['Payment terms', escapeCsvValue(invoice.payment_terms ?? '')].join(',')
  );
  rows.push('');
  rows.push(['Bill To', escapeCsvValue(clientName)].join(','));
  if (project?.client_email)
    rows.push(['', escapeCsvValue(project.client_email)].join(','));
  rows.push('');
  rows.push(['Name', 'Quantity', 'Rate type', 'Unit cost', 'Amount'].join(','));
  for (const item of invoice.items ?? []) {
    const rateType = item.rate_type ? String(item.rate_type).toLowerCase() : '';
    const rateLabel =
      rateType === 'hourly'
        ? 'Hourly'
        : rateType === 'fixed'
          ? 'Fixed'
          : rateType === 'monthly'
            ? 'Monthly'
            : rateType || '—';
    rows.push(
      [
        escapeCsvValue(item.name),
        escapeCsvValue(item.quantity),
        escapeCsvValue(rateLabel),
        escapeCsvValue(formatPriceWithCurrency(item.unit_cost, currencyCode)),
        escapeCsvValue(formatPriceWithCurrency(item.total_cost, currencyCode)),
      ].join(',')
    );
  }
  rows.push('');
  rows.push(
    ['Subtotal', formatPriceWithCurrency(invoice.subtotal, currencyCode)].join(
      ','
    )
  );
  rows.push(
    [
      `Tax (${invoice.tax_rate ?? 0}%)`,
      formatPriceWithCurrency(invoice.tax_amount ?? 0, currencyCode),
    ].join(',')
  );
  rows.push(
    ['Total', formatPriceWithCurrency(invoice.total_amount, currencyCode)].join(
      ','
    )
  );
  if (invoice.notes) {
    rows.push('');
    rows.push(['Notes', escapeCsvValue(invoice.notes)].join(','));
  }

  const csv = rows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${(invoice.invoice_number ?? invoice.id).replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

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

  // Close options menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        optionsMenuRef.current &&
        !optionsMenuRef.current.contains(event.target as Node)
      ) {
        setShowOptionsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-destructive">{error ?? 'Invoice not found'}</p>
          <Button variant="link" asChild className="mt-2 pl-0">
            <Link href={`/dashboard/projects/${projectId}`}>
              Back to project
            </Link>
          </Button>
        </div>
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: projectName, href: `/dashboard/projects/${projectId}` },
            {
              label: 'Invoices',
              href: `/dashboard/projects/${projectId}/invoices`,
            },
            {
              label: `Invoice ${invoice.invoice_number}`,
              href: `/dashboard/projects/${projectId}/invoices/${invoiceId}`,
            },
          ]}
          className="mb-6"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
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
          <div className="relative" ref={optionsMenuRef}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="h-9 w-9"
              aria-label="Invoice options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showOptionsMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[160px] rounded-md border bg-white py-1 shadow-lg">
                <a
                  href={`/api/invoices/${invoiceId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => setShowOptionsMenu(false)}
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    downloadInvoiceCsv(invoice, currencyCode);
                    setShowOptionsMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Download CSV
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
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

        <Card className="mb-6">
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
          <Card className="mb-6">
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
      </div>
    </div>
  );
}
