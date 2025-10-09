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

interface ManualTimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId: string;
  taskName: string;
  currentDuration: number; // Current duration from database in seconds
  onTimeEntryUpdated?: () => void; // Callback to refresh timer display
}

export function ManualTimeEntryModal({
  open,
  onOpenChange,
  taskId,
  projectId,
  taskName,
  currentDuration,
  onTimeEntryUpdated,
}: ManualTimeEntryModalProps) {
  const [newDuration, setNewDuration] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get refresh function from timer context
  const { refreshTimerForTask } = useTimeTrackingContext();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setNewDuration('');
      setErrorMessage(null);
      setValidationError(null);
    }
  }, [open]);

  // Calculate projected duration
  const projectedDuration = useMemo(() => {
    const numValue = parseInt(newDuration, 10);
    return isNaN(numValue) ? 0 : numValue;
  }, [newDuration]);

  // Validate input
  const validateInput = (value: string): string | null => {
    if (value === '') return null; // Allow empty for user to clear and retype

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    if (numValue < 1) {
      return 'Duration must be at least 1 second';
    }
    return null;
  };

  const handleInputChange = (value: string) => {
    setNewDuration(value);
    setValidationError(validateInput(value));
    setErrorMessage(null); // Clear any previous errors
  };

  const handleSubmit = async () => {
    // Validate input
    const validation = validateInput(newDuration);
    if (validation) {
      setValidationError(validation);
      return;
    }

    const durationSeconds = parseInt(newDuration, 10);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Check if time entry exists
      const checkResponse = await fetch(`/api/time-entries?task_id=${taskId}`);
      if (!checkResponse.ok) {
        throw new Error('Failed to check existing time entry');
      }

      const checkData = await checkResponse.json();
      const existingTimeEntry = checkData.time_entries?.[0];

      if (existingTimeEntry) {
        // Update existing time entry
        const updateResponse = await fetch(
          `/api/time-entries/${existingTimeEntry.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              duration_seconds: durationSeconds,
              timer_status: 'stopped',
              end_time: new Date().toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update time entry');
        }
      } else {
        // Create new time entry
        const now = new Date();
        const endTime = new Date(now.getTime() + 1000); // Add 1 second to start time

        const createResponse = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: taskId,
            project_id: projectId,
            duration_seconds: durationSeconds,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            timer_status: 'stopped',
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || 'Failed to create time entry');
        }
      }

      // Success - refresh timer data and close modal
      setIsRefreshing(true);
      try {
        await refreshTimerForTask(taskId);
        onOpenChange(false);
        onTimeEntryUpdated?.();
      } catch (refreshError) {
        console.error('Error refreshing timer:', refreshError);
        // Still close modal even if refresh fails
        onOpenChange(false);
        onTimeEntryUpdated?.();
      } finally {
        setIsRefreshing(false);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update time entry'
      );
      setIsSubmitting(false);
    }
  };

  const handleResetTimer = async () => {
    setIsResetting(true);
    setErrorMessage(null);

    try {
      // Check if time entry exists
      const checkResponse = await fetch(`/api/time-entries?task_id=${taskId}`);
      if (!checkResponse.ok) {
        throw new Error('Failed to check existing time entry');
      }

      const checkData = await checkResponse.json();
      const existingTimeEntry = checkData.time_entries?.[0];

      if (existingTimeEntry) {
        // Delete existing time entry
        const deleteResponse = await fetch(
          `/api/time-entries/${existingTimeEntry.id}`,
          {
            method: 'DELETE',
          }
        );

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          throw new Error(errorData.error || 'Failed to reset timer');
        }
      }

      // Success - close modal and refresh page
      onOpenChange(false);

      // Show loading state during page refresh
      setIsRefreshing(true);

      // Small delay to let modal close smoothly
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error resetting timer:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to reset timer'
      );
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manual Time Entry</DialogTitle>
          <DialogDescription>
            Manually set the time duration for &quot;{taskName}&quot;
          </DialogDescription>
        </DialogHeader>

        {/* Error Message Display */}
        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />

        <div className="space-y-6">
          {/* Current Duration Display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500">
              Current Duration
            </Label>
            <div className="text-lg font-mono text-gray-700">
              {formatDuration(currentDuration)}
            </div>
          </div>

          {/* New Duration Input */}
          <div className="space-y-2">
            <Label htmlFor="new-duration">
              New Duration (seconds) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="new-duration"
              type="number"
              min="1"
              value={newDuration}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Enter duration in seconds"
              className={validationError ? 'border-red-500' : ''}
            />
            <ModalError
              errorMessage={validationError}
              onClose={() => setValidationError(null)}
              variant="inline"
            />
          </div>

          {/* Projected Duration Display */}
          {newDuration && !validationError && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Projected Duration
              </Label>
              <div className="text-lg font-mono text-blue-600">
                {formatDuration(projectedDuration)}
              </div>
            </div>
          )}

          {/* Reset Timer Section */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Reset Timer
              </Label>
              <p className="text-sm text-gray-600">
                This will completely remove the current time entry and reset the
                timer to zero.
              </p>
              <Button
                variant="destructive"
                onClick={handleResetTimer}
                disabled={
                  isSubmitting ||
                  isResetting ||
                  isRefreshing ||
                  currentDuration === 0
                }
              >
                {isResetting ? 'Resetting...' : 'Reset Current Timer'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isResetting || isRefreshing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              isResetting ||
              isRefreshing ||
              !newDuration ||
              !!validationError ||
              !!errorMessage ||
              projectedDuration === currentDuration
            }
          >
            {isSubmitting ? 'Updating...' : 'Update Time Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
