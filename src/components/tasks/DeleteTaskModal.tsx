'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { TaskWithDetails } from '@/types';

interface DeleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithDetails | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteTaskModal({
  open,
  onOpenChange,
  task,
  onConfirmDelete,
  isDeleting,
}: DeleteTaskModalProps) {
  const handleConfirmDelete = async () => {
    try {
      await onConfirmDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Task</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="font-medium text-gray-900 mb-2">Task Details</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Name:</span> {task.name}
              </div>
              {task.project?.name && (
                <div>
                  <span className="font-medium">Project:</span>{' '}
                  {task.project.name}
                </div>
              )}
              {task.description && (
                <div>
                  <span className="font-medium">Description:</span>{' '}
                  {task.description}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Warning</p>
                <p>
                  Deleting this task will also remove all associated time
                  entries and cannot be undone. Make sure you want to proceed
                  with this action.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
