'use client';

import React, { useEffect, useState } from 'react';

import { CalendarIcon, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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
import { currencies } from '@/lib/currencies';
import { getPriorityColor, getPriorityLabel } from '@/lib/priority';
import { getStatusColor, getStatusLabel } from '@/lib/status';
import { formatDate, getAssigneeDisplayName } from '@/lib/utils';
import { Priority, Status, User } from '@/types/index';

// Consolidated state interface
interface InlineEditState {
  isEditing: boolean;
  editValue: string;
  localCurrency: string;
  localPrice: number;
  selectedDate: Date | undefined;
  calendarOpen: boolean;
}

// Helper functions for state initialization
const getInitialEditValue = (
  type: string,
  value: string | null | undefined
): string => {
  if (type === 'assignee') {
    return value || 'none';
  }
  return value || '';
};

const getInitialCurrency = (
  type: string,
  value: string | null | undefined,
  projectData?: { currency_code?: string | null }
): string => {
  if (type === 'price-currency' && value) {
    const parts = value.toString().split(' ');
    return parts[0] || 'USD';
  }
  return projectData?.currency_code || 'USD';
};

const getInitialPrice = (
  type: string,
  value: string | null | undefined,
  projectData?: { price?: number | null }
): number => {
  if (type === 'price-currency' && value) {
    const parts = value.toString().split(' ');
    return parseFloat(parts[1]) || 0;
  }
  return projectData?.price || 0;
};

const getInitialDate = (
  type: string,
  value: string | null | undefined
): Date | undefined => {
  if (type === 'due-date' && value) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
};

interface InlineEditProps {
  value: string | null | undefined;
  type?:
    | 'text'
    | 'textarea'
    | 'rate-type'
    | 'price-currency'
    | 'status'
    | 'priority'
    | 'assignee'
    | 'due-date';
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  onSave: (value: string | number | null) => Promise<void>;
  onError?: (error: string) => void;
  error?: string | null;
  projectData?: {
    price?: number | null;
    currency_code?: string | null;
  };
  assigneeData?: {
    users: User[];
    currentUserId?: string;
    assigneeUser?: { name?: string; email: string };
  };
}

export function InlineEdit({
  value,
  type = 'text',
  placeholder = 'Click to edit',
  className = '',
  multiline = false,
  rows = 3,
  onSave,
  onError,
  error,
  projectData,
  assigneeData,
}: InlineEditProps) {
  // Consolidated state management
  const [state, setState] = useState<InlineEditState>(() => ({
    isEditing: false,
    editValue: getInitialEditValue(type, value),
    localCurrency: getInitialCurrency(type, value, projectData),
    localPrice: getInitialPrice(type, value, projectData),
    selectedDate: getInitialDate(type, value),
    calendarOpen: false,
  }));

  // Destructure state for easier access
  const {
    isEditing,
    editValue,
    localCurrency,
    localPrice,
    selectedDate,
    calendarOpen,
  } = state;

  // State updater function
  const updateState = (updates: Partial<InlineEditState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Update local states when value prop changes
  useEffect(() => {
    if (type === 'price-currency' && value) {
      const parts = value.toString().split(' ');
      updateState({
        localCurrency: parts[0] || 'USD',
        localPrice: parseFloat(parts[1]) || 0,
      });
    }
    if (type === 'due-date' && value) {
      const date = new Date(value);
      updateState({
        selectedDate: isNaN(date.getTime()) ? undefined : date,
      });
    }
  }, [value, type]);

  const handleSave = async () => {
    try {
      if (type === 'due-date') {
        // For due-date, use the selected date
        if (selectedDate) {
          const dateString = formatDate(selectedDate);
          await onSave(dateString);
        } else {
          await onSave(null);
        }
      } else if (editValue !== value) {
        if (type === 'price-currency') {
          // For price-currency, use the local states directly
          if (localPrice >= 0) {
            // We'll call onSave with a special format that the parent can handle
            await onSave(`${localCurrency}|${localPrice}`);
          } else {
            return;
          }
        } else if (type === 'assignee') {
          // For assignee, convert "none" to null for unassigned
          await onSave(editValue === 'none' ? null : editValue);
        } else {
          await onSave(editValue);
        }
      }
      // Only exit edit mode after successful save
      updateState({ isEditing: false });
      // Clear any existing error on successful save
      if (onError && error) {
        onError('');
      }
    } catch (error) {
      // Handle error - don't close editing mode so user can retry
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save';
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    if (type === 'assignee') {
      updateState({ editValue: value || 'none' });
    } else if (type === 'due-date') {
      // Reset to original date
      if (value) {
        const date = new Date(value);
        updateState({
          selectedDate: isNaN(date.getTime()) ? undefined : date,
        });
      } else {
        updateState({ selectedDate: undefined });
      }
    } else {
      updateState({ editValue: value || '' });
    }
    // Reset local states for price-currency
    if (projectData) {
      updateState({
        localCurrency: projectData.currency_code || 'USD',
        localPrice: projectData.price || 0,
      });
    }
    // Clear any existing error when canceling
    if (onError && error) {
      onError('');
    }
    updateState({ isEditing: false });
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if the related target (what we're focusing to) is one of our buttons
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.inline-edit-buttons')) {
      // We're focusing to a button, don't cancel
      return;
    }
    // We're focusing away from the edit area, cancel the edit
    handleCancel();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    updateState({ editValue: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const wrapWithError = (content: React.ReactNode) => (
    <div className="space-y-1">
      {content}
      {error && (
        <div className="text-sm text-red-600 flex items-center space-x-1">
          <span>{error}</span>
        </div>
      )}
    </div>
  );

  const handleStartEdit = () => {
    // Clear any existing error when starting a new edit
    if (onError && error) {
      onError('');
    }
    updateState({ isEditing: true });
  };

  if (isEditing) {
    if (type === 'rate-type') {
      return wrapWithError(
        <div className="flex items-center space-x-2">
          <Select
            value={editValue}
            onValueChange={value => updateState({ editValue: value })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="fixed">Fixed Price</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (type === 'price-currency') {
      return wrapWithError(
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            <Select
              value={localCurrency}
              onValueChange={currency => {
                updateState({
                  localCurrency: currency,
                  editValue: `${currency} ${localPrice}`,
                });
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
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
            <Input
              type="number"
              step="0.01"
              min="0"
              value={localPrice.toString()}
              onChange={e => {
                const price = parseFloat(e.target.value) || 0;
                updateState({
                  localPrice: price,
                  editValue: `${localCurrency} ${price}`,
                });
              }}
              className="flex-1"
              placeholder="Enter amount"
            />
          </div>
          <div className="flex items-center space-x-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (type === 'status') {
      return wrapWithError(
        <div className="flex items-center space-x-2">
          <Select
            value={editValue}
            onValueChange={value => updateState({ editValue: value })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (type === 'priority') {
      return wrapWithError(
        <div className="flex items-center space-x-2">
          <Select
            value={editValue}
            onValueChange={value => updateState({ editValue: value })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (type === 'assignee') {
      return wrapWithError(
        <div className="flex items-center space-x-2">
          <Select
            value={editValue}
            onValueChange={value => updateState({ editValue: value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No assignee</SelectItem>
              {assigneeData?.users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {getAssigneeDisplayName(
                    { name: user.name, email: user.email },
                    assigneeData.currentUserId,
                    user.id
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (type === 'due-date') {
      return wrapWithError(
        <div className="flex items-center space-x-2">
          <Popover
            open={calendarOpen}
            onOpenChange={open => updateState({ calendarOpen: open })}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? formatDate(selectedDate) : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  updateState({
                    selectedDate: date,
                    calendarOpen: false,
                  });
                }}
                captionLayout="dropdown"
                startMonth={new Date(new Date().getFullYear() - 10, 0, 1)}
                endMonth={new Date(new Date().getFullYear() + 10, 11, 31)}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center space-x-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (multiline || type === 'textarea') {
      return wrapWithError(
        <div className="flex items-start space-x-2">
          <Textarea
            value={editValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
            rows={rows}
            className={`flex-1 ${className}`}
          />
          <div className="flex flex-col space-y-1 inline-edit-buttons">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
              tabIndex={0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return wrapWithError(
      <div className="flex items-center space-x-2">
        <Input
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          className={`flex-1 ${className}`}
        />
        <div className="flex items-center space-x-1 inline-edit-buttons">
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
            tabIndex={0}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleCancel}
            className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
            tabIndex={0}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // For status type, render as a styled badge
  if (type === 'status' && value) {
    return wrapWithError(
      <div
        onClick={handleStartEdit}
        className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(value as Status)} ${className}`}
      >
        {getStatusLabel(value as Status)}
      </div>
    );
  }

  // For priority type, render as a styled badge
  if (type === 'priority' && value) {
    return wrapWithError(
      <div
        onClick={handleStartEdit}
        className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getPriorityColor(value as Priority)} ${className}`}
      >
        {getPriorityLabel(value as Priority)}
      </div>
    );
  }

  // For assignee type, render as clickable text
  if (type === 'assignee' && value && assigneeData?.assigneeUser) {
    const displayName = getAssigneeDisplayName(
      assigneeData.assigneeUser,
      assigneeData.currentUserId,
      value
    );

    if (displayName) {
      return wrapWithError(
        <div
          onClick={handleStartEdit}
          className={`cursor-pointer border rounded px-3 py-2 min-h-[40px] flex items-center ${
            error ? 'border-red-500' : 'border-gray-200'
          } ${className}`}
        >
          {displayName}
        </div>
      );
    }
  }

  // For due-date type, render as clickable text with formatted date
  if (type === 'due-date' && value) {
    const date = new Date(value);
    const isValidDate = !isNaN(date.getTime());

    if (isValidDate) {
      return wrapWithError(
        <div
          onClick={handleStartEdit}
          className={`cursor-pointer border rounded px-3 py-2 min-h-[40px] flex items-center ${
            error ? 'border-red-500' : 'border-gray-200'
          } ${className}`}
        >
          {formatDate(value)}
        </div>
      );
    }
  }

  return wrapWithError(
    <div
      onClick={handleStartEdit}
      className={`cursor-pointer border rounded px-3 py-2 min-h-[40px] ${
        error ? 'border-red-500' : 'border-gray-200'
      } ${multiline || type === 'textarea' ? 'whitespace-pre-wrap' : 'flex items-center'} ${className}`}
    >
      {value || placeholder}
    </div>
  );
}
