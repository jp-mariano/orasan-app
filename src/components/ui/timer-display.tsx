import { Play, Pause, Square, RotateCcw } from 'lucide-react';

import { formatDuration } from '@/lib/utils';

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
  compact?: boolean; // Whether to use compact styling
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
  compact = false,
}: TimerDisplayProps) {
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
            className={`font-mono font-semibold ${getStatusColor()} ${
              compact ? 'text-sm' : 'text-lg'
            }`}
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
            className={`p-0 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
            title="Start timer"
          >
            <Play className={compact ? 'h-2 w-2' : 'h-3 w-3'} />
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
            className={`p-0 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
            title="Resume timer"
          >
            <RotateCcw className={compact ? 'h-2 w-2' : 'h-3 w-3'} />
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
            className={`p-0 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
            title="Pause timer"
          >
            <Pause className={compact ? 'h-2 w-2' : 'h-3 w-3'} />
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
            className={`p-0 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
            title="Stop timer"
          >
            <Square className={compact ? 'h-2 w-2' : 'h-3 w-3'} />
          </Button>
        )}
      </div>
    </div>
  );
}
