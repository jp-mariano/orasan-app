'use client';

import { useEffect, useMemo, useState } from 'react';

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
import { ModalError } from '@/components/ui/modal-error';
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
import { currencies } from '@/lib/currencies';
import { getPriorityOptions } from '@/lib/priority';
import { getStatusOptions } from '@/lib/status';
import {
  cn,
  convertCurrencyEmptyToNull,
  convertRateTypeEmptyToNull,
  formatDate,
  getAssigneeDisplayName,
  validatePricingConsistency,
} from '@/lib/utils';
import {
  CreateTaskRequest,
  Priority,
  Project,
  RateType,
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
      rate_type: undefined,
      price: undefined,
      currency_code: undefined,
    }),
    [project.id, currentUser?.id]
  );

  // Form data state - use union type but handle status separately
  const [formData, setFormData] = useState<CreateTaskRequest>(defaultFormData);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('new');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

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
        rate_type: task.rate_type || undefined,
        price: task.price,
        currency_code: task.currency_code || undefined,
      });
      setTaskStatus(task.status);
      setModifiedFields(new Set());
    } else {
      setFormData(defaultFormData);
      setTaskStatus('new');
      setModifiedFields(new Set());
      setErrorMessage(null); // Clear error message when modal closes
      setNameError(null); // Clear name error when modal closes
    }
  }, [isEditMode, task, project.id, currentUser?.id, defaultFormData]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      if (isEditMode && task) {
        // Edit mode: reset to original task data
        setFormData({
          name: task.name,
          description: task.description || '',
          project_id: task.project_id,
          priority: task.priority,
          due_date: task.due_date || undefined,
          assignee: task.assignee || undefined,
          rate_type: task.rate_type || undefined,
          price: task.price,
          currency_code: task.currency_code || undefined,
        });
        setTaskStatus(task.status);
      } else {
        // Create mode: reset to defaults
        setFormData(defaultFormData);
        setTaskStatus('new');
      }
      setModifiedFields(new Set());
      setErrorMessage(null); // Clear error message when modal closes
      setNameError(null); // Clear name error when modal closes
    }
  }, [open, isEditMode, task, defaultFormData]);

  // Check if form is valid for submit button
  const isFormValid = formData.name.trim().length > 0;

  // Check if there are changes in edit mode
  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    return modifiedFields.size > 0;
  }, [isEditMode, modifiedFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any existing error messages
    setErrorMessage(null);
    setNameError(null);

    if (!formData.name.trim()) {
      setNameError('Task name is required');
      return;
    }

    // Validate pricing fields consistency only if user has provided any pricing data
    const hasProvidedPricingData =
      formData.rate_type !== undefined ||
      (formData.price !== undefined && formData.price !== null) ||
      formData.currency_code !== undefined;

    if (hasProvidedPricingData) {
      const pricingValidation = validatePricingConsistency(
        convertRateTypeEmptyToNull(formData.rate_type),
        formData.price !== undefined ? formData.price : undefined,
        convertCurrencyEmptyToNull(formData.currency_code)
      );

      if (!pricingValidation.isValid) {
        setErrorMessage(pricingValidation.error!);
        return;
      }
    }

    // Prepare task data based on mode
    let taskData: Partial<CreateTaskRequest | UpdateTaskRequest>;

    if (isEditMode) {
      // Edit mode - only include changed fields using object mapping
      const fieldMappings = {
        name: () => formData.name.trim(),
        description: () => formData.description?.trim() || undefined,
        priority: () => formData.priority,
        due_date: () => formData.due_date,
        assignee: () =>
          formData.assignee === 'none' ? null : formData.assignee,
        rate_type: () => convertRateTypeEmptyToNull(formData.rate_type),
        price: () =>
          formData.price !== undefined ? formData.price : undefined,
        currency_code: () => convertCurrencyEmptyToNull(formData.currency_code),
        status: () => taskStatus,
      } as const;

      taskData = Object.fromEntries(
        Object.entries(fieldMappings)
          .filter(([field]) =>
            modifiedFields.has(field as keyof typeof fieldMappings)
          )
          .map(([field, getValue]) => [field, getValue()])
      );
    } else {
      // Create mode - include all required fields
      taskData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        project_id: formData.project_id,
        priority: formData.priority,
        due_date: formData.due_date,
        assignee: formData.assignee === 'none' ? null : formData.assignee,
        rate_type: convertRateTypeEmptyToNull(formData.rate_type),
        price: formData.price !== undefined ? formData.price : undefined,
        currency_code: convertCurrencyEmptyToNull(formData.currency_code),
      };
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
    value: string | number | Priority | Date | undefined
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

    // Clear error messages when user starts typing
    if (field === 'name' && nameError) {
      setNameError(null);
    }
    if (errorMessage) {
      setErrorMessage(null);
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

  const priorityOptions = getPriorityOptions();

  const statusOptions = getStatusOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your task details and settings.'
              : 'Fill in the details below to create new task.'}
          </DialogDescription>
        </DialogHeader>

        {/* Error Message Display */}
        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />

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
              className={nameError ? 'border-red-500' : ''}
            />
            <ModalError
              errorMessage={nameError}
              onClose={() => setNameError(null)}
              variant="inline"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Describe your task"
              rows={3}
            />
          </div>

          {/* Due Date and Assignee Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                      ? formatDate(formData.due_date)
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
                    onSelect={date => {
                      handleInputChange(
                        'due_date',
                        date ? formatDate(date) : undefined
                      );
                      setCalendarOpen(false);
                    }}
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 10, 0, 1)}
                    endMonth={new Date(new Date().getFullYear() + 10, 11, 31)}
                    autoFocus
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
                      {getAssigneeDisplayName(
                        {
                          name:
                            currentUser.user_metadata?.full_name ||
                            currentUser.user_metadata?.name,
                          email: currentUser.email || '',
                        },
                        currentUser.id,
                        currentUser.id
                      )}
                    </SelectItem>
                  )}
                  {users
                    .filter(user => user.id !== currentUser?.id)
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {getAssigneeDisplayName({
                          name: user.name,
                          email: user.email,
                        })}
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
                        <span className={option.color}>{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="border-t"></div>

          {/* Currency and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency_code">Currency</Label>
              <Select
                value={formData.currency_code ?? ''}
                onValueChange={value =>
                  handleInputChange('currency_code', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{currency.code}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Rate/Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={
                  formData.price !== undefined && formData.price !== null
                    ? formData.price
                    : ''
                }
                onChange={e =>
                  handleInputChange(
                    'price',
                    e.target.value !== ''
                      ? parseFloat(e.target.value)
                      : undefined
                  )
                }
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* Rate Type */}
          <div className="space-y-2">
            <Label htmlFor="rate_type">Rate Type</Label>
            <Select
              value={formData.rate_type ?? ''}
              onValueChange={value =>
                handleInputChange('rate_type', value as RateType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rate type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
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
                isSubmitting ||
                !isFormValid ||
                (isEditMode && !hasChanges) ||
                !!nameError ||
                !!errorMessage
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
