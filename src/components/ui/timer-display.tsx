import { Play, Pause, Square, RotateCcw } from 'lucide-react';

import { Button } from './button';

interface TimerDisplayProps {
  duration: number;
  isRunning: boolean;
  isPaused: boolean;
  canStart: boolean;
  canResume: boolean;
  canPause: boolean;
  canStop: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  className?: string;
  hasTimer?: boolean; // Whether a timer entry exists
}

export function TimerDisplay({
  duration,
  isRunning,
  isPaused,
  canStart,
  canResume,
  canPause,
  canStop,
  onStart,
  onPause,
  onResume,
  onStop,
  className = '',
  hasTimer = false,
}: TimerDisplayProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusColor = (): string => {
    if (isRunning) return 'text-green-600';
    if (isPaused) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusText = (): string => {
    if (isRunning) return 'Running';
    if (isPaused) return 'Paused';
    return 'Stopped';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Timer Display - Only show if timer exists */}
      {hasTimer && (
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-lg font-semibold ${getStatusColor()}`}
          >
            {formatDuration(duration)}
          </span>
          <span className={`text-xs ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      )}

      {/* Timer Controls */}
      <div className="flex items-center gap-1">
        {canStart && (
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onStart();
            }}
            className="h-8 w-8 p-0"
            title="Start timer"
          >
            <Play className="h-3 w-3" />
          </Button>
        )}

        {canResume && (
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onResume();
            }}
            className="h-8 w-8 p-0"
            title="Resume timer"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}

        {canPause && (
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onPause();
            }}
            className="h-8 w-8 p-0"
            title="Pause timer"
          >
            <Pause className="h-3 w-3" />
          </Button>
        )}

        {canStop && (
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation();
              onStop();
            }}
            className="h-8 w-8 p-0"
            title="Stop timer"
          >
            <Square className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
