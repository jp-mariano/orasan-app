'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkSessionContext } from '@/contexts/work-session-context';
import { formatDuration } from '@/lib/utils';

interface MetricsCardsProps {
  projectCount: number;
}

export function MetricsCards({ projectCount }: MetricsCardsProps) {
  const { stats, statsLoading } = useWorkSessionContext();

  return (
    <div className="grid grid-cols-3 gap-6 mb-8">
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

      {/* Work Time Today Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Work Time Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsLoading ? '...' : formatDuration(stats.todayTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statsLoading
              ? 'Loading...'
              : stats.todayTime === 0
                ? 'No work time today'
                : 'Actual work time'}
          </p>
        </CardContent>
      </Card>

      {/* Work Time This Week Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Work Time This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statsLoading ? '...' : formatDuration(stats.weekTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statsLoading
              ? 'Loading...'
              : stats.weekTime === 0
                ? 'No work time this week'
                : 'Actual work time'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
