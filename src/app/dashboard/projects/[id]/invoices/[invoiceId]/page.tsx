'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { ChevronLeft, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';

import { DeleteInvoiceModal } from '@/components/invoices/DeleteInvoiceModal';
import { EditInvoiceModal } from '@/components/invoices/EditInvoiceModal';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/hooks/useUser';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { INVOICE_ITEMS_PER_PAGE } from '@/lib/invoice-utils';
import { formatDate } from '@/lib/utils';
import { InvoiceWithDetails } from '@/types';

function formatRateType(rateType: string | null | undefined): string {
  if (!rateType) return '—';
  const s = String(rateType).toLowerCase();
  if (s === 'hourly') return 'Hourly';
  if (s === 'fixed') return 'Fixed';
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [user, authLoading, router, invoiceId, projectId, refreshTrigger]);

  // Reset to page 1 when invoice changes
  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceId, refreshTrigger]);

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

  async function handleConfirmDeleteInvoice() {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete invoice');
      }
      router.push(`/dashboard/projects/${projectId}/invoices`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

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

  const items = invoice.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / INVOICE_ITEMS_PER_PAGE)
  );
  const startIdx = (currentPage - 1) * INVOICE_ITEMS_PER_PAGE;
  const pageItems = items.slice(startIdx, startIdx + INVOICE_ITEMS_PER_PAGE);
  const isLastPage = currentPage === totalPages;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
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
          />
          <div className="relative shrink-0" ref={optionsMenuRef}>
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
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[130px] rounded-md border bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(true);
                    setShowOptionsMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Edit
                </button>
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
                    setShowDeleteModal(true);
                    setShowOptionsMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {currentPage === 1 && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight py-8">
                Invoice
              </h1>
              <table>
                <tbody>
                  <tr>
                    <td className="pr-4 text-left">Invoice number</td>
                    <td>{invoice.invoice_number ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-left">Issue date</td>
                    <td>{formatDate(invoice.issue_date)}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 text-left">Due date</td>
                    <td>
                      {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <div>
                <h2 className="font-semibold">
                  {profile?.business_name || '—'}
                </h2>
                {profile?.business_address && <p>{profile.business_address}</p>}
                {profile?.business_email && <p>{profile.business_email}</p>}
                {profile?.business_phone && <p>{profile.business_phone}</p>}
                {profile?.tax_id && <p>Tax ID: {profile.tax_id}</p>}
              </div>

              <div>
                <h2 className="font-semibold">Bill To</h2>
                <p>{clientName}</p>
                {clientAddress && <p>{clientAddress}</p>}
                {clientEmail && <p>{clientEmail}</p>}
                {clientPhone && <p>{clientPhone}</p>}
              </div>
            </div>
          </>
        )}

        <div className="mb-8">
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
                  <th className="text-left py-2 font-semibold">Name</th>
                  <th className="text-right py-2 font-semibold">Quantity</th>
                  <th className="text-right py-2 font-semibold">
                    Unit price ({currencyCode})
                  </th>
                  <th className="text-right py-2 font-semibold">Rate type</th>
                  <th className="text-right py-2 font-semibold">
                    Amount ({currencyCode})
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">
                      {formatPriceWithCurrency(
                        item.unit_price,
                        currencyCode,
                        false
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {formatRateType(item.rate_type ?? null)}
                    </td>
                    <td className="py-2 text-right">
                      {formatPriceWithCurrency(
                        item.total_cost,
                        currencyCode,
                        false
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLastPage && (
            <>
              <div className="mt-6 flex justify-end">
                <dl className="w-full max-w-[240px] space-y-1 text-sm">
                  <div className="flex justify-between border-t pt-2">
                    <dt>Subtotal</dt>
                    <dd>
                      {formatPriceWithCurrency(invoice.subtotal, currencyCode)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <dt>Tax ({invoice.tax_rate ?? 0}%)</dt>
                    <dd>
                      {formatPriceWithCurrency(
                        invoice.tax_amount ?? 0,
                        currencyCode
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <dt>Total</dt>
                    <dd>
                      {formatPriceWithCurrency(
                        invoice.total_amount,
                        currencyCode
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <dt>Amount due</dt>
                    <dd>
                      {formatPriceWithCurrency(
                        invoice.total_amount,
                        currencyCode
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </div>

        {isLastPage && invoice.notes && (
          <div className="mb-8">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p>{invoice.notes}</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <EditInvoiceModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          invoice={invoice}
          onSaved={() => setRefreshTrigger(prev => prev + 1)}
        />

        <DeleteInvoiceModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          invoice={invoice}
          onConfirmDelete={handleConfirmDeleteInvoice}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
