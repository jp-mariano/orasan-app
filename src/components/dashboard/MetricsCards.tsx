'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboardStats';

interface MetricsCardsProps {
  projectCount: number;
}

export function MetricsCards({ projectCount }: MetricsCardsProps) {
  const {
    stats,
    isLoading: statsLoading,
    formatDuration,
  } = useDashboardStats();

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {/* Total Projects Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{projectCount}</div>
          <p className="text-xs text-muted-foreground">
            {projectCount === 0
              ? 'No projects yet'
              : projectCount <= 2
                ? `${2 - projectCount} remaining on free tier`
                : ''}
          </p>
        </CardContent>
      </Card>

      {/* Time Today Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Time Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsLoading ? '...' : formatDuration(stats.todayTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statsLoading
              ? 'Loading...'
              : stats.todayTime === 0
                ? 'No time tracked today'
                : 'Daily total'}
          </p>
        </CardContent>
      </Card>

      {/* This Week Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsLoading ? '...' : formatDuration(stats.weekTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statsLoading
              ? 'Loading...'
              : stats.weekTime === 0
                ? 'No time tracked this week'
                : 'Weekly total'}
          </p>
        </CardContent>
      </Card>

      {/* Active Timers Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeTimersCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeTimersCount === 0
              ? 'No active timers'
              : `${stats.activeTimersCount} running`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
