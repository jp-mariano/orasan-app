'use client';

import React, { useEffect, useState } from 'react';

import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { currencies } from '@/lib/currencies';
import {
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusLabel,
} from '@/lib/status';
import { Priority, Project } from '@/types/index';

interface InlineEditProps {
  value: string | null | undefined;
  type?:
    | 'text'
    | 'textarea'
    | 'rate-type'
    | 'price-currency'
    | 'status'
    | 'priority';
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  onSave: (value: string | number) => void;
  projectData?: {
    price?: number | null;
    currency_code?: string | null;
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
  projectData,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  // Local state for price-currency type
  const [localCurrency, setLocalCurrency] = useState(() => {
    if (type === 'price-currency' && value) {
      // Parse the value "USD 50.00" to get currency
      const parts = value.toString().split(' ');
      return parts[0] || 'USD';
    }
    return projectData?.currency_code || 'USD';
  });
  const [localPrice, setLocalPrice] = useState(() => {
    if (type === 'price-currency' && value) {
      // Parse the value "USD 50.00" to get price
      const parts = value.toString().split(' ');
      return parseFloat(parts[1]) || 0;
    }
    return projectData?.price || 0;
  });

  // Update local states when value prop changes
  useEffect(() => {
    if (type === 'price-currency' && value) {
      const parts = value.toString().split(' ');
      setLocalCurrency(parts[0] || 'USD');
      setLocalPrice(parseFloat(parts[1]) || 0);
    }
  }, [value, type]);

  const handleSave = () => {
    if (editValue !== value) {
      if (type === 'price-currency') {
        // For price-currency, use the local states directly
        if (localPrice > 0) {
          // We'll call onSave with a special format that the parent can handle
          onSave(`${localCurrency}|${localPrice}`);
        } else {
          return;
        }
      } else {
        onSave(editValue);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    // Reset local states for price-currency
    if (projectData) {
      setLocalCurrency(projectData.currency_code || 'USD');
      setLocalPrice(projectData.price || 0);
    }
    setIsEditing(false);
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
    setEditValue(e.target.value);
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

  if (isEditing) {
    if (type === 'rate-type') {
      return (
        <div className="flex items-center space-x-2">
          <Select value={editValue} onValueChange={setEditValue}>
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
      return (
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            <Select
              value={localCurrency}
              onValueChange={currency => {
                setLocalCurrency(currency);
                setEditValue(`${currency} ${localPrice}`);
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
              min="0.01"
              value={localPrice.toString()}
              onChange={e => {
                const price = parseFloat(e.target.value) || 0;
                setLocalPrice(price);
                setEditValue(`${localCurrency} ${price}`);
              }}
              className="flex-1"
              placeholder="0.00"
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
      return (
        <div className="flex items-center space-x-2">
          <Select value={editValue} onValueChange={setEditValue}>
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
      return (
        <div className="flex items-center space-x-2">
          <Select value={editValue} onValueChange={setEditValue}>
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

    if (multiline || type === 'textarea') {
      return (
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

    return (
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
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(value as Project['status'])} ${className}`}
      >
        {getStatusLabel(value as Project['status'])}
      </div>
    );
  }

  // For priority type, render as a styled badge
  if (type === 'priority' && value) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${getPriorityColor(value as Priority)} ${className}`}
      >
        {getPriorityLabel(value as Priority)}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer border border-gray-200 rounded px-3 py-2 min-h-[40px] ${multiline || type === 'textarea' ? 'whitespace-pre-wrap' : 'flex items-center'} ${className}`}
    >
      {value || placeholder}
    </div>
  );
}
