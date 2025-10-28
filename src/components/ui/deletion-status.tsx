import { useState } from 'react';

import { AlertTriangle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useUser } from '@/hooks/useUser';
import { calculateDeletionDate, formatDate } from '@/lib/utils';

interface DeletionStatusProps {
  user: {
    deletion_requested_at?: string;
    deletion_confirmed_at?: string;
  };
}

export function DeletionStatus({ user }: DeletionStatusProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { isCanceling, error, cancelAccountDeletion } = useAccountDeletion();
  const { refreshUser } = useUser();

  const handleCancelDeletion = async () => {
    const success = await cancelAccountDeletion();
    if (success) {
      setShowCancelConfirm(false);
      // Refresh user data to update the UI
      await refreshUser();
    }
  };

  // Show pending deletion (email confirmation needed)
  if (user.deletion_requested_at && !user.deletion_confirmed_at) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-800 font-medium text-sm">
                Account Deletion Requested
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                Please check your email for confirmation. Your account will be
                deleted after you confirm via email and after a 7-day grace
                period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show confirmed deletion (grace period)
  if (user.deletion_confirmed_at) {
    const deletionDate = calculateDeletionDate(user.deletion_confirmed_at);

    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium text-sm">
                Account Deletion Confirmed
              </h3>
              <p className="text-red-700 text-sm mt-1">
                Your account will be permanently deleted on{' '}
                <strong>{formatDate(deletionDate)}</strong>. You can cancel this
                request anytime before then.
              </p>

              {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

              <div className="mt-3">
                {!showCancelConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Cancel Deletion
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelDeletion}
                      disabled={isCanceling}
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      {isCanceling ? 'Canceling...' : 'Yes, Cancel Deletion'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCancelConfirm(false)}
                      className="text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
