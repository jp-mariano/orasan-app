'use client';

import { useCallback, useEffect, useState } from 'react';

import { CalendarIcon } from 'lucide-react';

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
import { cn, formatDate, formatDuration } from '@/lib/utils';
import { CreateInvoiceRequest, Project } from '@/types';

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  /** Called after successful creation with the created invoice id and project id */
  onInvoiceCreated?: (invoiceId: string, projectId: string) => void;
}

interface TimeEntryPreview {
  task_id: string;
  task_name: string;
  total_duration_seconds: number;
  entry_count: number;
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
    payment_terms: 'NET 30',
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
  const [timeEntryPreview, setTimeEntryPreview] = useState<TimeEntryPreview[]>(
    []
  );
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);

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
        payment_terms: 'NET 30',
        tax_rate: 0,
        currency_code: project.currency_code || 'USD',
        notes: '',
        date_range: {
          from: '',
          to: '',
        },
      });
      setErrorMessage(null);
      setTimeEntryPreview([]);
      setTotalDurationSeconds(0);
    }
  }, [open, project, refreshUser]);

  const fetchTimeEntryPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const fromDate = new Date(formData.date_range.from);
      const toDate = new Date(formData.date_range.to);
      toDate.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/time-entries?project_id=${project.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch time entries');
      }

      const data = await response.json();
      const timeEntries = data.time_entries || [];

      // Filter stopped entries within date range
      const filteredEntries = timeEntries.filter(
        (entry: {
          timer_status: string;
          end_time?: string;
          task_id: string;
          duration_seconds: number;
          task: { id: string; name: string } | null;
        }) => {
          if (entry.timer_status !== 'stopped' || !entry.end_time) {
            return false;
          }
          // Skip entries with null tasks (deleted tasks)
          if (!entry.task) {
            return false;
          }
          const endTime = new Date(entry.end_time);
          return endTime >= fromDate && endTime <= toDate;
        }
      );

      // Group by task
      const taskGroups = new Map<string, TimeEntryPreview>();
      let totalSeconds = 0;

      for (const entry of filteredEntries) {
        const task = entry.task as { id: string; name: string } | null;
        // Skip entries with null tasks (shouldn't happen after filter, but double-check)
        if (!task) {
          continue;
        }
        if (!taskGroups.has(entry.task_id)) {
          taskGroups.set(entry.task_id, {
            task_id: entry.task_id,
            task_name: task.name,
            total_duration_seconds: 0,
            entry_count: 0,
          });
        }

        const group = taskGroups.get(entry.task_id)!;
        group.total_duration_seconds += entry.duration_seconds;
        group.entry_count += 1;
        totalSeconds += entry.duration_seconds;
      }

      setTimeEntryPreview(Array.from(taskGroups.values()));
      setTotalDurationSeconds(totalSeconds);
    } catch (error) {
      console.error('Error fetching time entry preview:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load time entry preview'
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }, [formData.date_range.from, formData.date_range.to, project.id]);

  // Fetch preview when date range is complete
  useEffect(() => {
    const hasRange = formData.date_range.from && formData.date_range.to;
    if (hasRange && open && !isSubmitting) {
      fetchTimeEntryPreview();
    } else if (!hasRange || !open) {
      setTimeEntryPreview([]);
      setTotalDurationSeconds(0);
    }
  }, [
    formData.date_range.from,
    formData.date_range.to,
    open,
    isSubmitting,
    fetchTimeEntryPreview,
  ]);

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

    if (timeEntryPreview.length === 0) {
      setErrorMessage(
        'No stopped time entries found in the selected date range'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateInvoiceRequest = {
        project_id: project.id,
        invoice_number: formData.invoice_number?.trim() || undefined,
        issue_date: formData.issue_date,
        due_date: formData.due_date || undefined,
        payment_terms: formData.payment_terms || 'NET 30',
        tax_rate: formData.tax_rate || 0,
        currency_code: formData.currency_code || project.currency_code || 'USD',
        notes: formData.notes?.trim() || undefined,
        date_range: {
          from: formData.date_range.from,
          to: formData.date_range.to,
        },
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
            time entries
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

          {/* Time Entry Preview */}
          {isLoadingPreview && (
            <div className="text-sm text-gray-500">Loading preview...</div>
          )}
          {!isLoadingPreview &&
            formData.date_range.from &&
            formData.date_range.to &&
            timeEntryPreview.length > 0 && (
              <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-medium">
                  Preview ({timeEntryPreview.length} task
                  {timeEntryPreview.length !== 1 ? 's' : ''})
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {timeEntryPreview.map(preview => (
                    <div
                      key={preview.task_id}
                      className="text-sm flex justify-between"
                    >
                      <span className="text-gray-700">{preview.task_name}</span>
                      <span className="text-gray-600">
                        {formatDuration(preview.total_duration_seconds)} (
                        {preview.entry_count} entr
                        {preview.entry_count !== 1 ? 'ies' : 'y'})
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t text-sm font-medium">
                  Total: {formatDuration(totalDurationSeconds)}
                </div>
              </div>
            )}
          {!isLoadingPreview &&
            formData.date_range.from &&
            formData.date_range.to &&
            timeEntryPreview.length === 0 && (
              <div className="text-sm text-amber-600 border border-amber-200 rounded-lg p-3 bg-amber-50">
                No stopped time entries found in the selected date range
              </div>
            )}

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

          {/* Payment Terms and Tax Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Input
                id="payment-terms"
                value={formData.payment_terms || 'NET 30'}
                onChange={e =>
                  handleInputChange('payment_terms', e.target.value)
                }
                placeholder="NET 30"
              />
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
            />
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
              timeEntryPreview.length === 0
            }
          >
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
