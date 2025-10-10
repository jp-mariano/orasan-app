'use client';

import { Clock, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useActiveTimers } from '@/hooks/useActiveTimers';

import { ActiveTimerCard } from './ActiveTimerCard';

// Generate project colors based on project ID
function getProjectColor(projectId: string): string {
  const colors = [
    'oklch(0.6 0.2 240)', // Blue
    'oklch(0.7 0.15 160)', // Emerald
    'oklch(0.75 0.15 80)', // Amber
    'oklch(0.65 0.2 20)', // Red
    'oklch(0.65 0.2 300)', // Violet
    'oklch(0.7 0.15 200)', // Cyan
    'oklch(0.75 0.15 120)', // Lime
    'oklch(0.7 0.15 340)', // Pink
    'oklch(0.7 0.15 40)', // Orange
    'oklch(0.38 0.15 29)', // Maroon
  ];

  // Simple hash function to consistently assign colors to projects
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    const char = projectId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

export function ActiveTimersSection() {
  const { activeTimersWithDetails, isLoading, error, refreshActiveTimers } =
    useActiveTimers();

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Timers
          </CardTitle>
          <CardDescription>Currently running and paused timers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Failed to load active timers</p>
            <Button onClick={refreshActiveTimers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Timers
            </CardTitle>
            <CardDescription>
              Currently running and paused timers
            </CardDescription>
          </div>
          <Button
            onClick={refreshActiveTimers}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : activeTimersWithDetails.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No active timers</p>
            <p className="text-sm text-gray-400">
              Start a timer from any task to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTimersWithDetails.map(({ timer, task, project }) => (
              <ActiveTimerCard
                key={timer.id}
                timer={timer}
                taskName={task.name}
                projectName={project.name}
                projectColor={getProjectColor(project.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
