export type TimerStatus = 'running' | 'paused' | 'stopped';

export function getTimerStatusText(status: TimerStatus): string {
  if (status === 'running') return 'Running';
  if (status === 'paused') return 'Paused';
  return 'Stopped';
}

export function getTimerStatusColorClass(status: TimerStatus): string {
  if (status === 'running') return 'text-green-600';
  if (status === 'paused') return 'text-yellow-600';
  return 'text-gray-600';
}
