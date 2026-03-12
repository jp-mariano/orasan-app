'use client';

import { useEffect, useMemo, useState } from 'react';

import { AlertTriangle } from 'lucide-react';

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

interface CreateTimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId: string;
  taskName: string;
  onCreated?: () => void;
}

/**
 * Modal to create a new time entry (paused, optional initial duration).
 * If an active timer exists for this task, warns and stops it before creating.
 */
export function CreateTimeEntryModal({
  open,
  onOpenChange,
  taskName,
  taskId,
  projectId: _projectId,
  onCreated,
}: CreateTimeEntryModalProps) {
  void _projectId;
  const { getTimerForTask, stopTimer, refreshTimerForTask } =
    useTimeTrackingContext();
  const [durationInput, setDurationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeTimer = getTimerForTask(taskId);
  const hasActiveTimer = !!activeTimer;
  const isDefaultValue = durationInput.trim() === '';
  const canSubmit = !isSubmitting && (!isDefaultValue || hasActiveTimer);

  const parsedDuration = useMemo(() => {
    const raw = durationInput.trim();
    if (raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.floor(n);
  }, [durationInput]);

  useEffect(() => {
    if (open) {
      setDurationInput('');
      setErrorMessage(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const parsed = durationInput.trim() === '' ? 0 : parseFloat(durationInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      setErrorMessage('Enter a valid duration (0 or greater).');
      return;
    }
    const durationSeconds = Math.floor(parsed);

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (hasActiveTimer) {
        const stopped = await stopTimer(taskId);
        if (!stopped) {
          setErrorMessage('Failed to stop the current timer.');
          return;
        }
      }

      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          duration_seconds: durationSeconds,
          timer_status: 'paused',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create time entry');
      }

      await refreshTimerForTask(taskId);
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create time entry'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new entry</DialogTitle>
          <DialogDescription>
            Create a new time entry for &quot;{taskName}&quot;. It will start in
            Paused state; you can start or stop it from the list.
          </DialogDescription>
        </DialogHeader>

        {hasActiveTimer && (
          <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p>
              You have an active timer (running or paused). Creating a new entry
              will stop it first. Its current time will be saved.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="create-entry-duration">
            Initial duration (seconds)
          </Label>
          <Input
            id="create-entry-duration"
            type="number"
            min={0}
            step={1}
            placeholder="0"
            value={durationInput}
            onChange={e => setDurationInput(e.target.value)}
            disabled={isSubmitting}
          />
          {parsedDuration !== null && parsedDuration > 0 ? (
            <p className="text-xs text-muted-foreground">
              Result: {formatDuration(parsedDuration)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Use 0 to start with no time logged; you can start the timer or
              edit later.
            </p>
          )}
        </div>

        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Creating…' : 'Create Time Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
