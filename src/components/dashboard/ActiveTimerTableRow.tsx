'use client';

import { useRouter } from 'next/navigation';

import { TimerDisplay } from '@/components/ui/timer-display';
import { useTimerActions } from '@/hooks/useTimerActions';
import { LocalTimer } from '@/hooks/useTimeTracker';
import { truncateTextSmart } from '@/lib/utils';

interface ActiveTimerTableRowProps {
  timer: LocalTimer;
  taskName: string;
  projectId: string;
}

export function ActiveTimerTableRow({
  timer,
  taskName,
  projectId,
}: ActiveTimerTableRowProps) {
  const router = useRouter();
  const {
    timer: timerData,
    duration,
    canStart,
    canResume,
    canPause,
    canStop,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimerActions(timer.taskId, projectId);

  const handleRowClick = () => {
    router.push(`/dashboard/projects/${projectId}/tasks/${timer.taskId}`);
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <td className="py-3 px-4 font-medium text-gray-900">
        {truncateTextSmart(taskName, 40)}
      </td>
      <td
        className="py-3 px-4"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <TimerDisplay
          duration={duration}
          isRunning={timerData?.isRunning ?? false}
          isPaused={timerData?.isPaused ?? false}
          canStart={canStart}
          canResume={canResume}
          canPause={canPause}
          canStop={canStop}
          onStart={startTimer}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={stopTimer}
          hasTimer={!!timerData}
          compact
        />
      </td>
    </tr>
  );
}
