'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { useTimeTrackingContext } from '@/contexts/time-tracking-context';
import { formatDuration } from '@/lib/utils';
import { TimeEntry } from '@/types';

interface EditTimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntry: TimeEntry | null;
  onSaved?: () => void;
}

/**
 * Modal to edit an existing (stopped) time entry: change duration or reset to 0.
 */
export function EditTimeEntryModal({
  open,
  onOpenChange,
  timeEntry,
  onSaved,
}: EditTimeEntryModalProps) {
  const { refreshTimerForTask } = useTimeTrackingContext();
  const [durationInput, setDurationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDurationInput(String(timeEntry?.duration_seconds ?? 0));
    setErrorMessage(null);
    setValidationError(null);
  }, [open, timeEntry?.duration_seconds]);

  const parsedDuration = useMemo(() => {
    const raw = durationInput.trim();
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.floor(n);
  }, [durationInput]);

  const validate = (value: string): string | null => {
    const raw = value.trim();
    if (raw === '') return 'Duration is required';
    const n = Number(raw);
    if (!Number.isFinite(n)) return 'Please enter a valid number';
    if (n < 0) return 'Duration must be 0 or greater';
    if (!Number.isInteger(n)) return 'Duration must be a whole number';
    return null;
  };

  if (!timeEntry) return null;

  const entry = timeEntry;
  const isRunning = entry.timer_status === 'running';
  const isPaused = entry.timer_status === 'paused';
  const isStopped = entry.timer_status === 'stopped';
  const hasDurationChange =
    parsedDuration !== null &&
    !validationError &&
    parsedDuration !== (entry.duration_seconds ?? 0);

  const handleSave = async (nextDurationSeconds: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_seconds: nextDurationSeconds,
          timer_status: isPaused ? 'paused' : 'stopped',
          end_time: isStopped
            ? (entry.end_time ?? new Date().toISOString())
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update time entry');
      }
      await refreshTimerForTask(entry.task_id);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update time entry'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit timer</DialogTitle>
          <DialogDescription>
            Update the duration for this time entry, or reset it to 0.
          </DialogDescription>
        </DialogHeader>

        {isRunning && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Pause the timer before editing its duration.
          </div>
        )}

        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500">
              Current duration
            </Label>
            <div className="text-lg font-mono text-gray-700">
              {formatDuration(entry.duration_seconds ?? 0)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-entry-duration">New duration (seconds)</Label>
            <Input
              id="edit-entry-duration"
              type="number"
              min={0}
              step={1}
              value={durationInput}
              onChange={e => {
                setDurationInput(e.target.value);
                setValidationError(validate(e.target.value));
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              className={validationError ? 'border-red-500' : ''}
            />
            <ModalError
              errorMessage={validationError}
              onClose={() => setValidationError(null)}
              variant="inline"
            />
            {parsedDuration !== null && !validationError && (
              <p className="text-xs text-muted-foreground">
                Result: {formatDuration(parsedDuration)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleSave(0)}
            disabled={
              isSubmitting || isRunning || (entry.duration_seconds ?? 0) === 0
            }
          >
            Reset to 0
          </Button>
          <Button
            onClick={() => {
              const v = validate(durationInput);
              if (v) {
                setValidationError(v);
                return;
              }
              handleSave(Number(durationInput));
            }}
            disabled={isSubmitting || isRunning || !hasDurationChange}
          >
            {isSubmitting
              ? 'Updating...'
              : hasDurationChange
                ? 'Update Time Entry'
                : 'No Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
