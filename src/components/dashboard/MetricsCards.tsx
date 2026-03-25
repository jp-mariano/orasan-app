'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkSessionContext } from '@/contexts/work-session-context';
import { useUser } from '@/hooks/useUser';
import { formatDuration } from '@/lib/utils';

interface MetricsCardsProps {
  projectCount: number;
  /** Non-completed projects; used for Free-tier limits (same rule as read-only enforcement). */
  activeProjectCount: number;
}

export function MetricsCards({
  projectCount,
  activeProjectCount,
}: MetricsCardsProps) {
  const { stats, statsLoading } = useWorkSessionContext();
  const { user, loading: userLoading } = useUser();

  const totalProjectsCaption = (() => {
    if (projectCount === 0) return 'No projects yet';
    if (userLoading) return '';
    if (user?.subscription_tier === 'pro') {
      return 'Unlimited on Pro';
    }
    if (activeProjectCount > 2) {
      return 'Free plan: only 2 active projects stay fully editable; older active projects may be read-only.';
    }
    return `${2 - activeProjectCount} remaining on Free plan`;
  })();

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
            {totalProjectsCaption}
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
