'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';

import { CreateTimeEntryModal } from '@/components/tasks/CreateTimeEntryModal';
import { DeleteTaskModal } from '@/components/tasks/DeleteTaskModal';
import { DeleteTimeEntryModal } from '@/components/tasks/DeleteTimeEntryModal';
import { EditTimeEntryModal } from '@/components/tasks/EditTimeEntryModal';
import { TaskModal } from '@/components/tasks/TaskModal';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Header } from '@/components/ui/header';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Label } from '@/components/ui/label';
import { TimerDisplay } from '@/components/ui/timer-display';
import { useAuth } from '@/contexts/auth-context';
import { useErrorDisplay } from '@/hooks/useErrorDisplay';
import { useFreeTierWritableProjects } from '@/hooks/useFreeTierWritableProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTimerActions } from '@/hooks/useTimerActions';
import { useUser } from '@/hooks/useUser';
import { getTimerStatusColorClass, getTimerStatusText } from '@/lib/timer-ui';
import { formatDate, formatDuration } from '@/lib/utils';
import { ProjectStatus, TaskWithDetails, TimeEntry } from '@/types';

const TIME_ENTRIES_PER_PAGE = 10;

export default function TaskDetailPage() {
  const { user, loading } = useAuth();
  const { user: userProfile } = useUser();
  const params = useParams();
  const router = useRouter();

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Handle errors with the new error display hook
  const { shouldShowErrorDisplay, ErrorDisplayComponent, inlineErrorMessage } =
    useErrorDisplay(error, { context: 'data', fallbackToInline: true });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loadingTimeEntries, setLoadingTimeEntries] = useState(false);
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<TimeEntry | null>(
    null
  );
  const [isDeletingTimeEntry, setIsDeletingTimeEntry] = useState(false);
  const [timeEntriesPage, setTimeEntriesPage] = useState(1);
  const [openTimeEntryMenuId, setOpenTimeEntryMenuId] = useState<string | null>(
    null
  );
  const [timeEntryToEdit, setTimeEntryToEdit] = useState<TimeEntry | null>(
    null
  );
  const [showCreateEntryModal, setShowCreateEntryModal] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  const projectId = params.id as string;
  const taskId = params.taskId as string;
  const freeTier = useFreeTierWritableProjects();
  const isReadOnly = !freeTier.isProjectWritable(projectId);

  // Task management
  const { updateTask, deleteTask } = useTasks({ projectId });
  const timerActions = useTimerActions(taskId, projectId);

  // Fetch task data - same pattern as Project page
  useEffect(() => {
    if (!projectId || !taskId) return;

    const fetchTask = async () => {
      try {
        setLoadingTask(true);
        setError(null);

        // Now we can use the project-scoped API directly
        const response = await fetch(
          `/api/projects/${projectId}/tasks/${taskId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch task');
        }

        const data = await response.json();
        setTask(data.task);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task');
      } finally {
        setLoadingTask(false);
      }
    };

    fetchTask();
  }, [projectId, taskId]);

  // Fetch time entries for this task (latest first)
  const fetchTimeEntries = useCallback(async () => {
    if (!taskId) return;
    setLoadingTimeEntries(true);
    try {
      const res = await fetch(`/api/time-entries?task_id=${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch time entries');
      const data = await res.json();
      const entries: TimeEntry[] = data.time_entries ?? [];
      const sorted = [...entries].sort((a, b) => {
        const dateA = new Date(
          a.end_time ?? a.start_time ?? a.created_at
        ).getTime();
        const dateB = new Date(
          b.end_time ?? b.start_time ?? b.created_at
        ).getTime();
        return dateB - dateA;
      });
      setTimeEntries(sorted);
      setTimeEntriesPage(1);
    } catch {
      setTimeEntries([]);
    } finally {
      setLoadingTimeEntries(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    fetchTimeEntries();
  }, [taskId, fetchTimeEntries]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setShowActions(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(target)) {
        setOpenTimeEntryMenuId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSaveField = async (
    field: string,
    value: string | number | null
  ) => {
    if (!task) return;

    try {
      const updatedTask = await updateTask(taskId, { [field]: value });

      // Update local task state
      setTask(updatedTask);
      // Clear field error on success
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update task';

      // Set field-specific error
      setFieldErrors(prev => ({ ...prev, [field]: errorMessage }));

      // Re-throw the error so InlineEdit can catch it
      throw err;
    }
  };

  const handleDeleteTask = () => {
    setShowDeleteModal(true);
  };

  const handleUpdateTask = async (
    taskData: import('@/types').UpdateTaskRequest
  ) => {
    if (!task) return;

    try {
      const updatedTask = await updateTask(taskId, taskData);

      setTask(updatedTask);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      const success = await deleteTask(taskId);

      if (success) {
        // Redirect back to project page
        router.push(`/dashboard/projects/${projectId}`);
      } else {
        setError('Failed to delete task');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleConfirmDeleteTimeEntry = async () => {
    if (!timeEntryToDelete) return;
    setIsDeletingTimeEntry(true);
    try {
      const res = await fetch(`/api/time-entries/${timeEntryToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete time entry');
      setTimeEntries(prev => {
        const next = prev.filter(e => e.id !== timeEntryToDelete.id);
        const maxPage = Math.ceil(next.length / TIME_ENTRIES_PER_PAGE) || 1;
        setTimeEntriesPage(p => Math.min(p, maxPage));
        return next;
      });
      setTimeEntryToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete time entry'
      );
    } finally {
      setIsDeletingTimeEntry(false);
    }
  };

  if (loading || loadingTask) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show ErrorDisplay for critical errors
  if (shouldShowErrorDisplay && ErrorDisplayComponent) {
    return <ErrorDisplayComponent />;
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <ErrorDisplay
            title="Task Not Found"
            message="The requested task could not be found."
            onBack={() => router.push(`/dashboard/projects/${projectId}`)}
          />
        </div>
      </div>
    );
  }

  const isTaskCompleted = task.status === 'completed';
  const totalTaskSeconds = timeEntries.reduce((sum, entry) => {
    const isActiveEntry = timerActions.timer?.id === entry.id;
    const seconds = isActiveEntry
      ? timerActions.duration
      : (entry.duration_seconds ?? 0);
    return sum + Number(seconds || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            {
              label: task.project?.name || 'Project',
              href: `/dashboard/projects/${projectId}`,
            },
            {
              label: task.name,
              href: `/dashboard/projects/${projectId}/tasks/${taskId}`,
            },
          ]}
          className="mb-6"
        />

        {/* Non-Critical Error Message */}
        {inlineErrorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {inlineErrorMessage}
          </div>
        )}

        {/* Task Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Task Information</CardTitle>
                <CardDescription>
                  Manage task details and settings
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative" ref={actionsRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowActions(!showActions)}
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  {showActions && (
                    <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[130px]">
                      <button
                        onClick={() => {
                          setIsEditModalOpen(true);
                          setShowActions(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        <span>Edit Task</span>
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteTask();
                          setShowActions(false);
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Task Name
              </Label>
              <InlineEdit
                value={task.name}
                onSave={async value => await handleSaveField('name', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, name: error }))
                }
                error={fieldErrors.name}
                className="text-xl font-semibold"
              />
            </div>

            {/* Description */}
            {task.description ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <InlineEdit
                  value={task.description}
                  onSave={async value =>
                    await handleSaveField('description', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, description: error }))
                  }
                  error={fieldErrors.description}
                  multiline
                  placeholder="Add a description..."
                  className="text-gray-700"
                />
              </div>
            ) : null}

            {/* Due Date */}
            {task.due_date ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Due Date
                </Label>
                <InlineEdit
                  value={task.due_date}
                  type="due-date"
                  onSave={async value =>
                    await handleSaveField('due_date', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, due_date: error }))
                  }
                  error={fieldErrors.due_date}
                  placeholder="Set due date..."
                  className="text-gray-700"
                />
              </div>
            ) : null}

            {/* Assignee */}
            {task.assignee && task.assignee_user ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Assignee
                </Label>
                <InlineEdit
                  value={task.assignee}
                  type="assignee"
                  onSave={async value =>
                    await handleSaveField('assignee', value)
                  }
                  onError={error =>
                    setFieldErrors(prev => ({ ...prev, assignee: error }))
                  }
                  error={fieldErrors.assignee}
                  placeholder="Unassigned"
                  className="text-gray-700"
                  assigneeData={{
                    users: user
                      ? [
                          {
                            id: user.id,
                            email: user.email || '',
                            name:
                              userProfile?.name ||
                              user.user_metadata?.full_name ||
                              user.user_metadata?.name,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          },
                        ]
                      : [],
                    currentUserId: user?.id,
                    assigneeUser: task.assignee_user,
                  }}
                />
              </div>
            ) : null}

            {/* Task Rate Type and Price (uses project currency) */}
            {task.rate_type && task.price !== null ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500 block">
                    Rate Type
                  </Label>
                  <InlineEdit
                    value={task.rate_type}
                    type="rate-type"
                    onSave={async value =>
                      await handleSaveField('rate_type', value)
                    }
                    onError={error =>
                      setFieldErrors(prev => ({ ...prev, rate_type: error }))
                    }
                    error={fieldErrors.rate_type}
                    placeholder="Not set"
                    className="text-center capitalize"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-500 block">
                    Price
                  </Label>
                  <InlineEdit
                    value={`${task.project?.currency_code ?? 'USD'} ${
                      task.price
                    }`}
                    type="price-currency"
                    currencyReadOnly
                    onSave={async value => {
                      // Parse the combined value format "USD|50.00"
                      if (typeof value === 'string' && value.includes('|')) {
                        const [, priceStr] = value.split('|');
                        const price = parseFloat(priceStr);
                        if (!isNaN(price) && price >= 0) {
                          // Update price only; currency is inherited from project
                          await handleSaveField('price', price);
                        }
                      }
                    }}
                    onError={error =>
                      setFieldErrors(prev => ({ ...prev, price: error }))
                    }
                    error={fieldErrors.price}
                    placeholder="USD 0.00"
                    className="text-center"
                    projectData={{
                      price: task.price,
                      currency_code: task.project?.currency_code ?? 'USD',
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Priority
              </Label>
              <InlineEdit
                value={task.priority}
                type="priority"
                onSave={async value => await handleSaveField('priority', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, priority: error }))
                }
                error={fieldErrors.priority}
                className="text-gray-700"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Status
              </Label>
              <InlineEdit
                value={task.status}
                type="status"
                onSave={async value => await handleSaveField('status', value)}
                onError={error =>
                  setFieldErrors(prev => ({ ...prev, status: error }))
                }
                error={fieldErrors.status}
                className="text-gray-700"
              />
            </div>

            {/* Created/Updated Info */}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500 space-y-1">
                <div>
                  <span>Project:</span>{' '}
                  {task.project?.name || 'Unknown Project'}
                </div>
                <div>Created: {formatDate(task.created_at)}</div>
                <div>Last updated: {formatDate(task.updated_at)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time entries list */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>
                  Logged time for this task, latest first. Start the timer to
                  add more. Time tracking for fixed-rate tasks is for internal
                  use only and is not used in invoicing.
                </CardDescription>
              </div>
              <div className="shrink-0">
                <Button
                  size="sm"
                  onClick={() => setShowCreateEntryModal(true)}
                  disabled={isTaskCompleted || isReadOnly}
                  title={
                    isTaskCompleted
                      ? 'Time entries are locked for completed tasks'
                      : isReadOnly
                        ? 'This project is read-only on the Free plan'
                        : 'Add time entry'
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Entry
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTimeEntries ? (
              <p className="text-sm text-muted-foreground py-6">
                Loading time entries…
              </p>
            ) : timeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No time entries yet. Start the timer to log time.
              </p>
            ) : (
              <>
                <div className="mb-4 rounded-md border bg-white px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    Total accumulated time
                  </div>
                  <div className="mt-1 font-mono text-lg font-semibold">
                    {formatDuration(totalTaskSeconds)}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">
                          Date-Time
                        </th>
                        <th className="py-3 px-4 font-medium">Timer</th>
                        <th className="w-10 py-3 px-4" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries
                        .slice(
                          (timeEntriesPage - 1) * TIME_ENTRIES_PER_PAGE,
                          timeEntriesPage * TIME_ENTRIES_PER_PAGE
                        )
                        .map(entry => {
                          const isActiveTimer =
                            timerActions.timer?.id === entry.id;
                          return (
                            <tr
                              key={entry.id}
                              className="border-b hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                {new Date(entry.created_at).toLocaleString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isActiveTimer ? (
                                  <TimerDisplay
                                    duration={timerActions.duration}
                                    isRunning={
                                      timerActions.timer?.isRunning ?? false
                                    }
                                    isPaused={
                                      timerActions.timer?.isPaused ?? false
                                    }
                                    canStart={
                                      !isReadOnly &&
                                      !isTaskCompleted &&
                                      timerActions.canStart
                                    }
                                    canResume={
                                      !isReadOnly &&
                                      !isTaskCompleted &&
                                      timerActions.canResume
                                    }
                                    canPause={
                                      !isReadOnly &&
                                      !isTaskCompleted &&
                                      timerActions.canPause
                                    }
                                    canStop={
                                      !isReadOnly &&
                                      !isTaskCompleted &&
                                      timerActions.canStop
                                    }
                                    onStart={timerActions.startTimer}
                                    onPause={async () => {
                                      await timerActions.pauseTimer();
                                      fetchTimeEntries();
                                    }}
                                    onResume={timerActions.resumeTimer}
                                    onStop={async () => {
                                      await timerActions.stopTimer();
                                      fetchTimeEntries();
                                    }}
                                    hasTimer={!!timerActions.timer}
                                    compact
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-mono font-semibold ${getTimerStatusColorClass(
                                        entry.timer_status
                                      )} text-sm`}
                                    >
                                      {formatDuration(entry.duration_seconds)}
                                    </span>
                                    <span
                                      className={`text-xs ${getTimerStatusColorClass(
                                        entry.timer_status
                                      )}`}
                                    >
                                      {getTimerStatusText(entry.timer_status)}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div
                                  className="relative inline-block"
                                  ref={
                                    openTimeEntryMenuId === entry.id
                                      ? rowMenuRef
                                      : null
                                  }
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      setOpenTimeEntryMenuId(prev =>
                                        prev === entry.id ? null : entry.id
                                      )
                                    }
                                    disabled={isTaskCompleted}
                                    aria-label="Time entry options"
                                    title={
                                      isTaskCompleted
                                        ? 'Time entries are locked for completed tasks'
                                        : 'Time entry options'
                                    }
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                  {openTimeEntryMenuId === entry.id && (
                                    <div className="absolute right-0 top-full z-10 mt-1 min-w-[170px] rounded-md border bg-white py-1 shadow-lg">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenTimeEntryMenuId(null);
                                          setTimeEntryToEdit(entry);
                                          setShowEditEntryModal(true);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                                      >
                                        Edit Timer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTimeEntryToDelete(entry);
                                          setOpenTimeEntryMenuId(null);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Time Entry
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {timeEntries.length > TIME_ENTRIES_PER_PAGE && (
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setTimeEntriesPage(p => Math.max(1, p - 1))
                      }
                      disabled={timeEntriesPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {timeEntriesPage} of{' '}
                      {Math.ceil(timeEntries.length / TIME_ENTRIES_PER_PAGE)}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setTimeEntriesPage(p =>
                          Math.min(
                            Math.ceil(
                              timeEntries.length / TIME_ENTRIES_PER_PAGE
                            ),
                            p + 1
                          )
                        )
                      }
                      disabled={
                        timeEntriesPage >=
                        Math.ceil(timeEntries.length / TIME_ENTRIES_PER_PAGE)
                      }
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Task Modal */}
      {task && (
        <TaskModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          project={{
            id: projectId,
            name: task.project?.name || 'Unknown Project',
            status: (task.project?.status as ProjectStatus) ?? 'new',
            user_id: user?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            rate_type: task.project?.rate_type ?? undefined,
            price: task.project?.price ?? undefined,
            currency_code: task.project?.currency_code ?? undefined,
          }}
          task={task}
          onSubmit={handleUpdateTask}
        />
      )}

      {/* Delete Task Modal */}
      <DeleteTaskModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        task={task}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <DeleteTimeEntryModal
        open={!!timeEntryToDelete}
        onOpenChange={open => !open && setTimeEntryToDelete(null)}
        timeEntry={timeEntryToDelete}
        onConfirmDelete={handleConfirmDeleteTimeEntry}
        isDeleting={isDeletingTimeEntry}
      />

      {!isTaskCompleted && (
        <EditTimeEntryModal
          open={showEditEntryModal}
          onOpenChange={open => {
            setShowEditEntryModal(open);
            if (!open) setTimeEntryToEdit(null);
          }}
          timeEntry={timeEntryToEdit}
          onSaved={fetchTimeEntries}
        />
      )}

      {!isTaskCompleted && task && (
        <CreateTimeEntryModal
          open={showCreateEntryModal}
          onOpenChange={setShowCreateEntryModal}
          taskId={task.id}
          projectId={projectId}
          taskName={task.name}
          onCreated={fetchTimeEntries}
        />
      )}
    </div>
  );
}
