'use client';

import { useTimeTrackingContext } from '@/contexts/time-tracking-context';

export function TimerLimitDisplay() {
  const { error } = useTimeTrackingContext();

  if (!error) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">
              Timer Limit Reached
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
