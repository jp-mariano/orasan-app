'use client';

import { useEffect, useMemo, useState } from 'react';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  CreateTaskRequest,
  Priority,
  Project,
  TaskStatus,
  TaskWithDetails,
  UpdateTaskRequest,
  User,
} from '@/types';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  users?: User[];
  task?: TaskWithDetails; // For edit mode
  onSubmit: (taskData: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
}

export function TaskModal({
  open,
  onOpenChange,
  project,
  users = [],
  task,
  onSubmit,
}: TaskModalProps) {
  const { user: currentUser } = useAuth();
  const isEditMode = !!task;

  // Default form data for create mode
  const defaultFormData = useMemo<CreateTaskRequest>(
    () => ({
      name: '',
      description: '',
      project_id: project.id,
      priority: 'low',
      due_date: undefined,
      assignee: currentUser?.id || undefined,
    }),
    [project.id, currentUser?.id]
  );

  // Form data state - use union type but handle status separately
  const [formData, setFormData] = useState<CreateTaskRequest>(defaultFormData);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('new');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track modified fields for edit mode
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Initialize form data based on mode
  useEffect(() => {
    if (isEditMode && task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        project_id: task.project_id,
        priority: task.priority,
        due_date: task.due_date || undefined,
        assignee: task.assignee || undefined,
      });
      setTaskStatus(task.status);
      setModifiedFields(new Set());
    } else {
      setFormData(defaultFormData);
      setTaskStatus('new');
      setModifiedFields(new Set());
    }
  }, [isEditMode, task, project.id, currentUser?.id, defaultFormData]);

  // Check if form is valid for submit button
  const isFormValid = formData.name.trim().length > 0;

  // Check if there are changes in edit mode
  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    return modifiedFields.size > 0;
  }, [isEditMode, modifiedFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }

    if (newErrors.name) {
      setErrors(newErrors);
      return;
    }

    // Prepare task data, handling the "none" assignee value
    const taskData = {
      ...formData,
      assignee: formData.assignee === 'none' ? undefined : formData.assignee,
    };

    // Add status for edit mode
    if (isEditMode) {
      (taskData as UpdateTaskRequest).status = taskStatus;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(taskData);
      // Reset form and close modal on success
      if (!isEditMode) {
        setFormData(defaultFormData);
        setTaskStatus('new');
      }
      onOpenChange(false);
    } catch (error) {
      // Handle error (error will be handled by parent component)
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateTaskRequest,
    value: string | Priority | Date | undefined
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Track modified fields in edit mode
    if (isEditMode && task) {
      const originalValue = task[field as keyof TaskWithDetails];
      if (value !== originalValue) {
        setModifiedFields(prev => new Set(prev).add(field));
      } else {
        setModifiedFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(field);
          return newSet;
        });
      }
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleStatusChange = (value: TaskStatus) => {
    setTaskStatus(value);

    // Track modified fields in edit mode
    if (isEditMode && task) {
      if (value !== task.status) {
        setModifiedFields(prev => new Set(prev).add('status'));
      } else {
        setModifiedFields(prev => {
          const newSet = new Set(prev);
          newSet.delete('status');
          return newSet;
        });
      }
    }
  };

  const priorityOptions: { value: Priority; label: string; color: string }[] = [
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'low', label: 'Low', color: 'text-gray-600' },
  ];

  const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Edit task "${task?.name}"`
              : `Add a new task to "${project.name}" project`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Task Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="Enter task name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          {/* Due Date and Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.due_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date
                      ? format(new Date(formData.due_date), 'PPP')
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.due_date
                        ? new Date(formData.due_date)
                        : undefined
                    }
                    onSelect={date =>
                      handleInputChange('due_date', date?.toISOString())
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={formData.assignee || 'none'}
                onValueChange={value => handleInputChange('assignee', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignee</SelectItem>
                  {currentUser && (
                    <SelectItem value={currentUser.id}>
                      {currentUser.user_metadata?.full_name ||
                        currentUser.user_metadata?.name ||
                        currentUser.email}{' '}
                      (You)
                    </SelectItem>
                  )}
                  {users
                    .filter(user => user.id !== currentUser?.id)
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Priority) =>
                  handleInputChange('priority', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status - Only show in edit mode */}
            {isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={taskStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || !isFormValid || (isEditMode && !hasChanges)
              }
            >
              {isSubmitting
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
