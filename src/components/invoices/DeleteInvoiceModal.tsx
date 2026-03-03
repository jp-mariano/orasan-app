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
import { Invoice } from '@/types';

interface DeleteInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteInvoiceModal({
  open,
  onOpenChange,
  invoice,
  onConfirmDelete,
  isDeleting,
}: DeleteInvoiceModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirmDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  if (!invoice) return null;

  const displayName =
    invoice.invoice_number ?? `Invoice ${invoice.id.slice(0, 8)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Delete Invoice</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete &quot;{displayName}&quot;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> Deleting this invoice will also remove:
            </p>
            <ul className="text-sm text-red-600 mt-2 ml-4 space-y-1">
              <li>• All line items on this invoice</li>
              <li>• Invoice history and data</li>
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
            {isDeleting ? <>Deleting...</> : <>Delete Invoice</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
