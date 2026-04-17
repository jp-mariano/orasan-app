'use client';

import { useEffect, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { ChevronLeft, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';

import { CreateInvoiceModal } from '@/components/invoices/CreateInvoiceModal';
import { DeleteInvoiceModal } from '@/components/invoices/DeleteInvoiceModal';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/ui/header';
import { useAuth } from '@/contexts/auth-context';
import { useUser } from '@/hooks/useUser';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { INVOICE_PRO_ONLY_ERROR_MESSAGE } from '@/lib/subscription-enforcement';
import { formatDate } from '@/lib/utils';
import { Invoice, Project } from '@/types';

const INVOICES_PER_PAGE = 10;

export default function ProjectInvoicesPage() {
  const { user, loading: authLoading } = useAuth();
  const { user: userProfile } = useUser();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPro = userProfile?.subscription_tier === 'pro';

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
        if (projectData.project) {
          setProject(projectData.project);
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

  useEffect(() => {
    setInvoicesPage(1);
  }, [projectId, invoices.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function updateInvoiceStatus(
    invoiceId: string,
    status: 'sent' | 'paid'
  ) {
    setUpdatingId(invoiceId);
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
      setInvoices(prev =>
        prev.map(inv => (inv.id === invoiceId ? { ...inv, status } : inv))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmDeleteInvoice() {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete invoice');
      }
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
      setInvoiceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  }

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

  const totalPages = Math.max(
    1,
    Math.ceil(invoices.length / INVOICES_PER_PAGE)
  );
  const pageInvoices = invoices.slice(
    (invoicesPage - 1) * INVOICES_PER_PAGE,
    invoicesPage * INVOICES_PER_PAGE
  );

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
              label: project?.name || 'Project',
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Invoices
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Invoices for this project. Click an invoice to view details.
                  {!isPro && (
                    <span className="block mt-1">
                      On the Free plan you can view and download existing
                      invoices; creating or changing them requires Pro.
                    </span>
                  )}
                </p>
              </div>
              {project && (
                <Button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="shrink-0"
                  disabled={!isPro}
                  title={!isPro ? INVOICE_PRO_ONLY_ERROR_MESSAGE : undefined}
                >
                  Create invoice
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground py-6">
                {isPro
                  ? 'No invoices yet. Create an invoice using the button above.'
                  : 'No invoices yet. Create invoice is available on Pro only.'}
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
                      <th
                        className="w-10 py-3 px-4 text-right"
                        aria-label={isPro ? 'Options' : 'Download PDF'}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {pageInvoices.map(inv => (
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
                        <td
                          className="py-3 px-4 text-right"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        >
                          {isPro ? (
                            <div
                              ref={openMenuId === inv.id ? menuRef : null}
                              className="relative inline-block"
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setOpenMenuId(prev =>
                                    prev === inv.id ? null : inv.id
                                  )
                                }
                                disabled={updatingId === inv.id}
                                className="h-8 w-8 p-0"
                                aria-label="Invoice options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                              {openMenuId === inv.id && (
                                <div className="absolute right-0 top-full z-10 mt-1 min-w-[130px] rounded-md border bg-white py-1 shadow-lg">
                                  {inv.status === 'draft' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateInvoiceStatus(inv.id, 'sent')
                                      }
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                                    >
                                      Mark as Sent
                                    </button>
                                  )}
                                  {inv.status !== 'paid' &&
                                    inv.status !== 'cancelled' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateInvoiceStatus(inv.id, 'paid')
                                        }
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                                      >
                                        Mark as Paid
                                      </button>
                                    )}
                                  <a
                                    href={`/api/invoices/${inv.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                                    onClick={() => setOpenMenuId(null)}
                                  >
                                    Download PDF
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInvoiceToDelete(inv);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <a
                              href={`/api/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                              title="Download PDF"
                            >
                              Download PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoices.length > INVOICES_PER_PAGE && (
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setInvoicesPage(p => Math.max(1, p - 1))}
                      disabled={invoicesPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      p => (
                        <Button
                          key={p}
                          variant={invoicesPage === p ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 min-w-8 p-0"
                          onClick={() => setInvoicesPage(p)}
                          aria-label={`Page ${p}`}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setInvoicesPage(p => Math.min(totalPages, p + 1))
                      }
                      disabled={invoicesPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <DeleteInvoiceModal
          open={!!invoiceToDelete}
          onOpenChange={open => !open && setInvoiceToDelete(null)}
          invoice={invoiceToDelete}
          onConfirmDelete={handleConfirmDeleteInvoice}
          isDeleting={isDeleting}
        />

        {project && (
          <CreateInvoiceModal
            open={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}
            project={project}
            onInvoiceCreated={invoiceId => {
              setIsCreateModalOpen(false);
              if (invoiceId && projectId) {
                router.push(
                  `/dashboard/projects/${projectId}/invoices/${invoiceId}`
                );
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
