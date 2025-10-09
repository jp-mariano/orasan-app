'use client';

import { useTimerActions } from '@/hooks/useTimerActions';

interface ResetTimerButtonProps {
  taskId: string;
  projectId: string;
  onClear: () => void;
}

export function ResetTimerButton({
  taskId,
  projectId,
  onClear,
}: ResetTimerButtonProps) {
  const timerActions = useTimerActions(taskId, projectId);

  const handleResetTimer = async () => {
    await timerActions.resetTimer();
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
          handleResetTimer();
        }}
        className="flex items-center justify-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
      >
        <span>Reset Timer</span>
      </button>
    </>
  );
}
