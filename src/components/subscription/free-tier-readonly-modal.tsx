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

export function FreeTierReadonlyModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  writableProjectCount: number;
  totalActiveProjectCount: number;
}) {
  const { open, onOpenChange, writableProjectCount, totalActiveProjectCount } =
    props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Free plan project limit</DialogTitle>
          <DialogDescription>
            The Free plan allows up to 2 active projects. You currently have{' '}
            {totalActiveProjectCount} active projects.
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Only your newest {writableProjectCount} active projects are
            editable.
          </p>
          <p>
            All other projects (and their tasks, timers, and invoices) are
            read-only until you upgrade to Pro or reduce your active projects to
            two.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
