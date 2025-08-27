'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Project } from '@/types/index';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteProjectModal({
  open,
  onOpenChange,
  project,
  onConfirmDelete,
  isDeleting,
}: DeleteProjectModalProps) {
  if (!project) return null;

  const handleConfirm = async () => {
    await onConfirmDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Delete Project</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete &quot;{project.name}&quot;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> Deleting this project will also remove:
            </p>
            <ul className="text-sm text-red-600 mt-2 ml-4 space-y-1">
              <li>• All associated tasks</li>
              <li>• All time entries</li>
              <li>• Project history and data</li>
            </ul>
          </div>
        </div>

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
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
