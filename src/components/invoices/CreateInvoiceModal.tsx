'use client';

import { useCallback, useEffect, useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/useUser';
import { formatPriceWithCurrency } from '@/lib/currencies';
import { cn, formatDate } from '@/lib/utils';
import { CreateInvoiceRequest, Project } from '@/types';

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  /** Called after successful creation with the created invoice id and project id */
  onInvoiceCreated?: (invoiceId: string, projectId: string) => void;
}

interface InvoicePreviewItem {
  task_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  rate_type: 'hourly' | 'fixed' | null;
}

function formatRateType(rateType: string | null | undefined): string {
  if (!rateType) return '—';
  const s = String(rateType).toLowerCase();
  if (s === 'hourly') return 'Hourly';
  if (s === 'fixed') return 'Fixed';
  return rateType;
}

export function CreateInvoiceModal({
  open,
  onOpenChange,
  project,
  onInvoiceCreated,
}: CreateInvoiceModalProps) {
  const { user, refreshUser } = useUser();
  const [formData, setFormData] = useState<CreateInvoiceRequest>({
    project_id: project.id,
    invoice_number: '',
    issue_date: formatDate(new Date()),
    due_date: undefined,
    tax_rate: 0,
    currency_code: project.currency_code || 'USD',
    notes: '',
    date_range: {
      from: '',
      to: '',
    },
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<InvoicePreviewItem[]>([]);
  const [previewCurrency, setPreviewCurrency] = useState('USD');
  const [excludedTaskIds, setExcludedTaskIds] = useState<Set<string>>(
    new Set()
  );

  // Calendar states
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      // Refresh user data when modal opens to get latest business info
      refreshUser();
      setFormData({
        project_id: project.id,
        invoice_number: '',
        issue_date: formatDate(new Date()),
        due_date: undefined,
        tax_rate: 0,
        currency_code: project.currency_code || 'USD',
        notes: '',
        date_range: {
          from: '',
          to: '',
        },
      });
      setErrorMessage(null);
      setPreviewItems([]);
      setExcludedTaskIds(new Set());
    }
  }, [open, project, refreshUser]);

  const fetchInvoicePreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/invoices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          date_range: {
            from: formData.date_range.from,
            to: formData.date_range.to,
          },
          tax_rate: formData.tax_rate ?? 0,
          currency_code:
            formData.currency_code || project.currency_code || 'USD',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load preview');
      }

      const data = await response.json();
      setPreviewItems(data.items ?? []);
      setPreviewCurrency(data.currency_code ?? 'USD');
      setExcludedTaskIds(new Set());
    } catch (error) {
      console.error('Error fetching invoice preview:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load invoice preview'
      );
      setPreviewItems([]);
    } finally {
      setIsLoadingPreview(false);
    }
    // formData.tax_rate intentionally excluded: including it would trigger refetch on tax
    // change and reset excludedTaskIds (user's removed items would reappear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.date_range.from,
    formData.date_range.to,
    formData.currency_code,
    project.id,
    project.currency_code,
  ]);

  // Fetch preview when date range is complete
  useEffect(() => {
    const hasRange = formData.date_range.from && formData.date_range.to;
    if (hasRange && open && !isSubmitting) {
      fetchInvoicePreview();
    } else if (!hasRange || !open) {
      setPreviewItems([]);
      setExcludedTaskIds(new Set());
    }
  }, [
    formData.date_range.from,
    formData.date_range.to,
    open,
    isSubmitting,
    fetchInvoicePreview,
  ]);

  const visibleItems = previewItems.filter(
    item => !excludedTaskIds.has(item.task_id)
  );
  const subtotal = visibleItems.reduce((sum, i) => sum + i.total_cost, 0);
  const taxRate = formData.tax_rate ?? 0;
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const removeItem = (taskId: string) => {
    setExcludedTaskIds(prev => new Set([...prev, taskId]));
  };

  const updateItem = (
    taskId: string,
    field: 'quantity' | 'unit_price',
    value: number
  ) => {
    setPreviewItems(prev =>
      prev.map(item => {
        if (item.task_id !== taskId) return item;
        const q =
          field === 'quantity' ? value : Math.round(item.quantity * 100) / 100;
        const u =
          field === 'unit_price'
            ? value
            : Math.round(item.unit_price * 100) / 100;
        const total_cost = Math.round(q * u * 100) / 100;
        return { ...item, quantity: q, unit_price: u, total_cost };
      })
    );
  };

  const handleInputChange = (
    field: keyof CreateInvoiceRequest,
    value: string | number | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setErrorMessage(null);
  };

  const handleDateRangeChange = (
    field: 'from' | 'to',
    date: Date | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      date_range: {
        ...prev.date_range,
        [field]: date ? formatDate(date) : '',
      },
    }));
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.date_range.from || !formData.date_range.to) {
      setErrorMessage('Please select a date range');
      return;
    }

    if (!formData.issue_date) {
      setErrorMessage('Issue date is required');
      return;
    }

    // Validate date range
    const fromDate = new Date(formData.date_range.from);
    const toDate = new Date(formData.date_range.to);
    if (fromDate > toDate) {
      setErrorMessage('End date must be after start date');
      return;
    }

    if (visibleItems.length === 0) {
      setErrorMessage(
        'No stopped time entries found in the selected date range'
      );
      return;
    }

    const validItems = visibleItems.filter(
      item => item.quantity > 0 && item.unit_price >= 0
    );
    if (validItems.length === 0) {
      setErrorMessage(
        'At least one item with quantity > 0 and unit price ≥ 0 is required.'
      );
      return;
    }

    const invalidTaskIds = visibleItems
      .filter(item => item.quantity <= 0 || item.unit_price < 0)
      .map(item => item.task_id);
    const allExcludedTaskIds = new Set([...excludedTaskIds, ...invalidTaskIds]);

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateInvoiceRequest = {
        project_id: project.id,
        invoice_number: formData.invoice_number?.trim() || undefined,
        issue_date: formData.issue_date,
        due_date: formData.due_date || undefined,
        tax_rate: formData.tax_rate || 0,
        currency_code: formData.currency_code || project.currency_code || 'USD',
        notes: formData.notes?.trim() || undefined,
        date_range: {
          from: formData.date_range.from,
          to: formData.date_range.to,
        },
        exclude_task_ids:
          allExcludedTaskIds.size > 0
            ? Array.from(allExcludedTaskIds)
            : undefined,
        item_overrides: Object.fromEntries(
          validItems.map(item => [
            item.task_id,
            {
              quantity: Math.round(item.quantity * 100) / 100,
              unit_price: Math.round(item.unit_price * 100) / 100,
            },
          ])
        ),
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const data = await response.json();
      const createdInvoice = data.invoice ?? data;
      const id = typeof createdInvoice === 'object' && createdInvoice?.id;

      // Success - close modal and notify with invoice id for navigation
      onOpenChange(false);
      if (id) {
        onInvoiceCreated?.(id, project.id);
      } else {
        onInvoiceCreated?.('', project.id);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create invoice'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Generate an invoice for &quot;{project.name}&quot; based on stopped
            time entries. Only completed tasks are included in the invoice.
          </DialogDescription>
        </DialogHeader>

        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />

        {/* Reminders for missing business/client information */}
        {(!user?.business_name ||
          !user?.business_email ||
          !project.client_name ||
          !project.client_email ||
          !project.rate_type ||
          project.price === null ||
          project.price === undefined) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <div className="space-y-2">
              {(!user?.business_name || !user?.business_email) && (
                <>
                  <p className="text-amber-800 font-medium mb-1">
                    Business Information Missing
                  </p>
                  <p className="text-amber-700">
                    To generate professional invoices, please set your business
                    information in{' '}
                    <a
                      href="/user-settings"
                      className="underline hover:text-amber-900"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      User Settings
                    </a>
                    .
                  </p>
                </>
              )}

              {(!project.client_name || !project.client_email) && (
                <>
                  <p className=" text-amber-800 font-medium mb-1">
                    Client Information Missing
                  </p>
                  <p className=" text-amber-700">
                    For complete invoices, consider adding client information
                    (name, email, address).
                  </p>
                </>
              )}

              {(!project.rate_type ||
                project.price === null ||
                project.price === undefined) && (
                <>
                  <p className=" text-amber-800 font-medium mb-1">
                    Pricing Information Missing
                  </p>
                  <p className=" text-amber-700">
                    This project does not have pricing configured. Please add a
                    rate type and price to the project (or to individual tasks)
                    before creating an invoice. Invoices require pricing
                    information to calculate amounts.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>
              Date Range <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.date_range.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_range.from
                      ? formatDate(formData.date_range.from)
                      : 'From date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.date_range.from
                        ? new Date(formData.date_range.from)
                        : undefined
                    }
                    onSelect={date => {
                      handleDateRangeChange('from', date);
                      setFromDateOpen(false);
                    }}
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 1, 0, 1)}
                    endMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>

              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.date_range.to && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_range.to
                      ? formatDate(formData.date_range.to)
                      : 'To date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.date_range.to
                        ? new Date(formData.date_range.to)
                        : undefined
                    }
                    onSelect={date => {
                      handleDateRangeChange('to', date);
                      setToDateOpen(false);
                    }}
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 1, 0, 1)}
                    endMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Items Preview */}
          {isLoadingPreview && (
            <div className="text-sm text-muted-foreground">
              Loading preview...
            </div>
          )}
          {!isLoadingPreview &&
            formData.date_range.from &&
            formData.date_range.to &&
            (previewItems.length > 0 ? (
              <div className="space-y-2">
                <Label>Items</Label>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-2 text-left font-medium">
                          Name
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-28">
                          Quantity
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-28">
                          Unit Price
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-24">
                          Rate Type
                        </th>
                        <th className="px-2 py-2 text-right font-medium w-24">
                          Amount
                        </th>
                        <th className="w-10 px-2 py-2" aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map(item => (
                        <tr key={item.task_id} className="border-b">
                          <td className="px-2 py-1 text-left text-sm">
                            <div>{item.name || '—'}</div>
                          </td>
                          <td className="px-2 py-1 text-right">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.quantity}
                              onChange={e =>
                                updateItem(
                                  item.task_id,
                                  'quantity',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-full border text-right"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unit_price}
                              onChange={e =>
                                updateItem(
                                  item.task_id,
                                  'unit_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-full border text-right"
                            />
                          </td>
                          <td className="px-2 py-1 text-right text-sm capitalize">
                            <div>{formatRateType(item.rate_type) || '—'}</div>
                          </td>
                          <td className="px-2 py-1 text-right">
                            {formatPriceWithCurrency(
                              item.total_cost,
                              previewCurrency,
                              false
                            )}
                          </td>
                          <td className="px-2 py-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => removeItem(item.task_id)}
                              aria-label="Remove item"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </td>
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
                        {formatPriceWithCurrency(
                          subtotal,
                          previewCurrency,
                          false
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <dt>Tax ({taxRate}%)</dt>
                      <dd>
                        {formatPriceWithCurrency(
                          taxAmount,
                          previewCurrency,
                          false
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <dt>Total</dt>
                      <dd>
                        {formatPriceWithCurrency(totalAmount, previewCurrency)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              <div className="text-sm text-amber-600 border border-amber-200 rounded-lg p-3 bg-amber-50">
                No stopped time entries found in the selected date range
              </div>
            ))}

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoice-number">Invoice Number (optional)</Label>
            <Input
              id="invoice-number"
              value={formData.invoice_number || ''}
              onChange={e =>
                handleInputChange('invoice_number', e.target.value)
              }
              placeholder="Auto-generated if left empty"
            />
          </div>

          {/* Issue Date and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Issue Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={issueDateOpen} onOpenChange={setIssueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.issue_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.issue_date
                      ? formatDate(formData.issue_date)
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.issue_date
                        ? new Date(formData.issue_date)
                        : undefined
                    }
                    onSelect={date => {
                      handleInputChange(
                        'issue_date',
                        date ? formatDate(date) : undefined
                      );
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
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.due_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date
                      ? formatDate(formData.due_date)
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.due_date
                        ? new Date(formData.due_date)
                        : undefined
                    }
                    onSelect={date => {
                      handleInputChange(
                        'due_date',
                        date ? formatDate(date) : undefined
                      );
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
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.tax_rate || 0}
              onChange={e =>
                handleInputChange('tax_rate', parseFloat(e.target.value) || 0)
              }
              placeholder="0"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={e => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes for the invoice"
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">
              {(formData.notes || '').length}/300
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
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
            disabled={
              isSubmitting ||
              !formData.date_range.from ||
              !formData.date_range.to ||
              !formData.issue_date ||
              visibleItems.length === 0
            }
          >
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
