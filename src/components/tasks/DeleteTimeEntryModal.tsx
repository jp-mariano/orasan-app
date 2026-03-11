'use client';

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
import { formatDuration } from '@/lib/utils';
import { TimeEntry } from '@/types';

interface DeleteTimeEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntry: TimeEntry | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteTimeEntryModal({
  open,
  onOpenChange,
  timeEntry,
  onConfirmDelete,
  isDeleting,
}: DeleteTimeEntryModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirmDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  if (!timeEntry) return null;

  const durationStr = formatDuration(timeEntry.duration_seconds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Delete Time Entry</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete this time entry ({durationStr})?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete Time Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
