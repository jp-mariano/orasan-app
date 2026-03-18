import { useEffect, useMemo, useState } from 'react';

import { useUser } from '@/hooks/useUser';
import { checkAndHandleUnauthorized } from '@/lib/unauthorized-handler';
import type { Project } from '@/types';

type State = {
  loading: boolean;
  overLimit: boolean;
  activeCount: number;
  writableProjectIds: string[];
};

const DEFAULT: State = {
  loading: true,
  overLimit: false,
  activeCount: 0,
  writableProjectIds: [],
};

function getWritableFromProjects(projects: Project[]) {
  const active = projects
    .filter(p => p.status !== 'completed')
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const activeCount = active.length;
  const overLimit = activeCount > 2;
  const writableProjectIds = overLimit ? active.slice(0, 2).map(p => p.id) : [];
  return { overLimit, activeCount, writableProjectIds };
}

export function useFreeTierWritableProjects() {
  const { user } = useUser();
  const [state, setState] = useState<State>(DEFAULT);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user) {
        setState(DEFAULT);
        return;
      }

      if (user.subscription_tier !== 'free') {
        setState({
          loading: false,
          overLimit: false,
          activeCount: 0,
          writableProjectIds: [],
        });
        return;
      }

      setState(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/projects');
      const data = await response.json();
      if (!response.ok) {
        await checkAndHandleUnauthorized(response);
        if (!cancelled) setState({ ...DEFAULT, loading: false });
        return;
      }

      const projects = (data.projects ?? []) as Project[];
      const computed = getWritableFromProjects(projects);
      if (!cancelled) setState({ loading: false, ...computed });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isFree = user?.subscription_tier === 'free';

  return useMemo(
    () => ({
      isFree,
      ...state,
      isProjectWritable: (projectId: string) =>
        !isFree ||
        !state.overLimit ||
        state.writableProjectIds.includes(projectId),
    }),
    [isFree, state]
  );
}
