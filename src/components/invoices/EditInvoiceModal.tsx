'use client';

import { useEffect, useMemo, useState } from 'react';

import { CalendarIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalError } from '@/components/ui/modal-error';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { cn, formatDate } from '@/lib/utils';
import {
  InvoiceItem,
  InvoiceStatus,
  InvoiceWithDetails,
  RateType,
  UpdateInvoiceRequest,
} from '@/types';

type EditInvoiceFormItem = {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  rate_type?: RateType | null;
};

function formatRateType(rateType: string | null | undefined): string {
  if (!rateType) return '';
  const s = String(rateType).toLowerCase();
  if (s === 'hourly') return 'hourly';
  if (s === 'fixed') return 'fixed';
  return s;
}

/** Allowed status transitions (must match API). Terminal: paid, cancelled. */
const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'paid', 'overdue', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  cancelled: [],
  paid: [],
};

function getStatusOptions(currentStatus: InvoiceStatus): InvoiceStatus[] {
  const next = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
  return [...new Set([currentStatus, ...next])];
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

interface EditInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails | null;
  onSaved?: () => void;
}

export function EditInvoiceModal({
  open,
  onOpenChange,
  invoice,
  onSaved,
}: EditInvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [items, setItems] = useState<EditInvoiceFormItem[]>([]);
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocked =
    invoice?.status === 'paid' || invoice?.status === 'cancelled';

  useEffect(() => {
    if (open && invoice) {
      setInvoiceNumber(invoice.invoice_number ?? '');
      setIssueDate(invoice.issue_date ?? '');
      setDueDate(invoice.due_date ?? '');
      setTaxRate(invoice.tax_rate ?? 0);
      setNotes(invoice.notes ?? '');
      setStatus(invoice.status ?? 'draft');
      setItems(
        (invoice.items ?? []).map((item: InvoiceItem) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          rate_type: item.rate_type ?? null,
        }))
      );
      setErrorMessage(null);
    }
  }, [open, invoice]);

  const hasChanges = useMemo(() => {
    if (!invoice || isLocked) return false;
    if (invoiceNumber !== (invoice.invoice_number ?? '')) return true;
    if (issueDate !== (invoice.issue_date ?? '')) return true;
    if (dueDate !== (invoice.due_date ?? '')) return true;
    if (taxRate !== (invoice.tax_rate ?? 0)) return true;
    if (notes !== (invoice.notes ?? '')) return true;
    if (status !== (invoice.status ?? 'draft')) return true;
    const origItems = invoice.items ?? [];
    if (items.length !== origItems.length) return true;
    return items.some(
      (a, i) =>
        Number(a.quantity) !== Number(origItems[i].quantity) ||
        Number(a.unit_price) !== Number(origItems[i].unit_price)
    );
  }, [
    invoice,
    isLocked,
    invoiceNumber,
    issueDate,
    dueDate,
    taxRate,
    notes,
    status,
    items,
  ]);

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: keyof EditInvoiceFormItem,
    value: string | number | RateType | null
  ) {
    setItems(prev =>
      prev.map((row, i) => (i !== index ? row : { ...row, [field]: value }))
    );
    setErrorMessage(null);
  }

  async function handleSubmit() {
    if (!invoice) return;
    if (isLocked) {
      setErrorMessage('Paid invoices cannot be edited.');
      return;
    }
    if (!issueDate.trim()) {
      setErrorMessage('Issue date is required.');
      return;
    }
    const validItems = items.filter(
      row => row.name.trim() !== '' && row.quantity > 0 && row.unit_price >= 0
    );
    if (validItems.length === 0) {
      setErrorMessage(
        'At least one item with name, quantity, and unit price is required.'
      );
      return;
    }
    for (const row of validItems) {
      if (row.name.trim() === '') {
        setErrorMessage('Every item must have a name.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: UpdateInvoiceRequest = {
        invoice_number: invoiceNumber.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate.trim() || undefined,
        tax_rate: taxRate,
        notes: notes.trim() || undefined,
        items: validItems.map(row => {
          const q = Math.round(Number(row.quantity) * 100) / 100;
          const u = Math.round(Number(row.unit_price) * 100) / 100;
          const total_cost = Math.round(q * u * 100) / 100;
          return {
            name: row.name.trim(),
            quantity: q,
            unit_price: u,
            total_cost,
            rate_type: row.rate_type ?? null,
          };
        }),
      };

      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update invoice');
      }
      const statusChanged =
        status !== invoice.status &&
        ['sent', 'paid', 'overdue', 'cancelled'].includes(status);
      if (statusChanged) {
        const patchRes = await fetch(`/api/invoices/${invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!patchRes.ok) {
          const patchData = await patchRes.json().catch(() => ({}));
          throw new Error(
            patchData.error ?? 'Invoice updated but failed to update status'
          );
        }
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update invoice'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!invoice) return null;

  const currencyCode = invoice.currency_code ?? 'USD';
  const subtotal = items.reduce(
    (sum, row) =>
      sum +
      Math.round(Number(row.quantity) * Number(row.unit_price) * 100) / 100,
    0
  );
  const taxAmount = Math.round(((subtotal * (taxRate ?? 0)) / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>
            Update invoice {invoice.invoice_number ?? invoice.id}. Paid or
            cancelled invoices cannot be edited.
          </DialogDescription>
        </DialogHeader>
        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
        {isLocked && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Paid or cancelled invoices cannot be edited.
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={v => setStatus(v as InvoiceStatus)}
              disabled={isLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions(invoice.status).map(s => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-left font-medium">Name</th>
                    <th className="px-2 py-2 text-center font-medium w-28">
                      Quantity
                    </th>
                    <th className="px-2 py-2 text-center font-medium w-28">
                      Unit Price
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-24">
                      Rate Type
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-24">
                      Amount
                    </th>
                    {!isLocked && (
                      <th className="w-10 px-2 py-2" aria-label="Remove" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-2 py-1 text-left text-sm">
                        <div>{row.name || '—'}</div>
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.quantity}
                          onChange={e =>
                            updateItem(
                              index,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={isLocked}
                          className="h-8 w-full border text-right"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.unit_price}
                          onChange={e =>
                            updateItem(
                              index,
                              'unit_price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={isLocked}
                          className="h-8 w-full border text-right"
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-sm capitalize">
                        <div>{formatRateType(row.rate_type) || '—'}</div>
                      </td>
                      <td className="px-2 py-1 text-right">
                        {formatPriceWithCurrency(
                          Math.round(
                            Number(row.quantity) * Number(row.unit_price) * 100
                          ) / 100,
                          currencyCode,
                          false
                        )}
                      </td>
                      {!isLocked && (
                        <td className="px-2 py-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            aria-label="Remove item"
                            title={
                              items.length === 1
                                ? 'Invoice must have at least one item'
                                : 'Remove item'
                            }
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <dl className="w-full max-w-[200px] space-y-1 text-sm">
                <div className="flex justify-between border-t pt-2">
                  <dt>Subtotal</dt>
                  <dd>
                    {formatPriceWithCurrency(subtotal, currencyCode, false)}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt>Tax ({taxRate ?? 0}%)</dt>
                  <dd>
                    {formatPriceWithCurrency(taxAmount, currencyCode, false)}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <dt>Total</dt>
                  <dd>{formatPriceWithCurrency(totalAmount, currencyCode)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-invoice-number">Invoice Number</Label>
            <Input
              id="edit-invoice-number"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              disabled={isLocked}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Popover open={issueDateOpen} onOpenChange={setIssueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isLocked}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !issueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? formatDate(issueDate) : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={issueDate ? new Date(issueDate) : undefined}
                    onSelect={date => {
                      setIssueDate(date ? formatDate(date) : '');
                      setIssueDateOpen(false);
                    }}
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 1, 0, 1)}
                    endMonth={new Date(new Date().getFullYear() + 1, 11, 31)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isLocked}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? formatDate(dueDate) : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate ? new Date(dueDate) : undefined}
                    onSelect={date => {
                      setDueDate(date ? formatDate(date) : '');
                      setDueDateOpen(false);
                    }}
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 1, 0, 1)}
                    endMonth={new Date(new Date().getFullYear() + 1, 11, 31)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tax-rate">Tax Rate (%)</Label>
            <Input
              id="edit-tax-rate"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              disabled={isLocked}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isLocked}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLocked || !hasChanges}
          >
            {isSubmitting
              ? 'Updating...'
              : hasChanges
                ? 'Update Invoice'
                : 'No Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
