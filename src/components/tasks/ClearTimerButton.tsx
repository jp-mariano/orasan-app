'use client';

import { useTimerActions } from '@/hooks/useTimerActions';

interface ClearTimerButtonProps {
  taskId: string;
  projectId: string;
  onClear: () => void;
}

export function ClearTimerButton({
  taskId,
  projectId,
  onClear,
}: ClearTimerButtonProps) {
  const timerActions = useTimerActions(taskId, projectId);

  const handleClearTimer = async () => {
    await timerActions.clearTimer();
    onClear();
  };

  // Only render if timer exists
  if (!timerActions.timer) {
    return null;
  }

  return (
    <>
      <div className="border-t my-1"></div>
      <button
        onClick={e => {
          e.stopPropagation();
          handleClearTimer();
        }}
        className="flex items-center justify-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
      >
        <span>Clear Timer</span>
      </button>
    </>
  );
}
