'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { currencies } from '@/lib/currencies';
import { getStatusOptions } from '@/lib/status';
import {
  convertCurrencyEmptyToNull,
  convertRateTypeEmptyToNull,
} from '@/lib/utils';
import {
  CreateProjectRequest,
  Project,
  ProjectStatus,
  RateType,
  UpdateProjectRequest,
} from '@/types/index';

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null; // If provided, we're editing; if not, we're creating
  onCreateProject?: (
    data: CreateProjectRequest
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateProject?: (
    data: UpdateProjectRequest
  ) => Promise<{ success: boolean; error?: string }>;
  canCreateProject?: boolean;
  currentProjectCount?: number;
}

export function ProjectModal({
  open,
  onOpenChange,
  project,
  onCreateProject,
  onUpdateProject,
  canCreateProject = true,
  currentProjectCount = 0,
}: ProjectModalProps) {
  const isEditMode = !!project;

  // Default values for create mode (these are placeholders, not actual values)
  const defaultFormData = useMemo<
    CreateProjectRequest & { status?: ProjectStatus }
  >(
    () => ({
      name: '',
      description: '',
      client_name: '',
      rate_type: '' as RateType, // Empty string for placeholder
      price: 0,
      currency_code: '', // Empty string for placeholder
      status: 'new', // Default status for new projects
    }),
    []
  );

  // Reset form when modal closes
  useEffect(() => {
    if (!open && !isEditMode) {
      setFormData(defaultFormData);
      setModifiedFields(new Set());
    }
  }, [open, isEditMode, defaultFormData]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track which fields have been modified by the user
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<
    CreateProjectRequest & { status?: ProjectStatus }
  >(defaultFormData);

  // Check if there are any changes in edit mode
  const hasChanges = useMemo(() => {
    if (!isEditMode || !project) return true; // Always allow submit in create mode

    return modifiedFields.size > 0;
  }, [isEditMode, project, modifiedFields]);

  // Initialize form data when project changes (for edit mode)
  useEffect(() => {
    if (project) {
      // Edit mode: populate with existing project data
      setFormData({
        name: project.name,
        description: project.description || '',
        client_name: project.client_name || '',
        rate_type: project.rate_type || null,
        price: project.price || 0,
        currency_code: project.currency_code || '',
        status: project.status, // Include status from existing project
      });
      // In edit mode, start with no modified fields (user hasn't made changes yet)
      setModifiedFields(new Set());
    } else {
      // Create mode: reset to defaults
      setFormData(defaultFormData);
      setModifiedFields(new Set());
    }
  }, [project, defaultFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    let result: { success: boolean; error?: string };

    // Helper function to determine if a field should be submitted
    const shouldSubmitField = (fieldName: string) => {
      if (isEditMode) return true; // In edit mode, always submit all fields
      return modifiedFields.has(fieldName); // In create mode, only submit modified fields
    };

    if (isEditMode && onUpdateProject) {
      // Edit mode
      const updateData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        client_name: formData.client_name?.trim() || undefined,
        rate_type: shouldSubmitField('rate_type')
          ? convertRateTypeEmptyToNull(formData.rate_type)
          : undefined,
        price: shouldSubmitField('price')
          ? formData.price || undefined
          : undefined,
        currency_code: shouldSubmitField('currency_code')
          ? convertCurrencyEmptyToNull(formData.currency_code)
          : undefined,
        status: shouldSubmitField('status') ? formData.status : undefined,
      };

      result = await onUpdateProject(updateData);
    } else if (!isEditMode && onCreateProject) {
      // Create mode
      const createData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        client_name: formData.client_name?.trim() || undefined,
        rate_type: shouldSubmitField('rate_type')
          ? convertRateTypeEmptyToNull(formData.rate_type)
          : undefined,
        price: shouldSubmitField('price')
          ? formData.price || undefined
          : undefined,
        currency_code: shouldSubmitField('currency_code')
          ? convertCurrencyEmptyToNull(formData.currency_code)
          : undefined,
      };

      result = await onCreateProject(createData);
    } else {
      result = { success: false, error: 'Invalid operation' };
    }

    setIsSubmitting(false);

    if (result.success) {
      // Close modal on success
      onOpenChange(false);
      // Reset form and modified fields for next use
      if (!isEditMode) {
        setFormData(defaultFormData);
        setModifiedFields(new Set());
      }
    } else {
      // Handle error (you might want to show a toast or error message)
      console.error(
        `Failed to ${isEditMode ? 'update' : 'create'} project:`,
        result.error
      );
    }
  };

  const handleInputChange = (
    field: keyof (CreateProjectRequest & { status?: ProjectStatus }),
    value: string | number | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Track that this field has been modified (in both create and edit modes)
    setModifiedFields(prev => new Set([...prev, field]));
  };

  // Show warning modal when project limit is reached (only for create mode)
  if (!isEditMode && !canCreateProject) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Limit Reached</DialogTitle>
            <DialogDescription>
              You have reached the maximum number of projects allowed in your
              current plan. Please upgrade your plan to create more projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your project details and settings.'
              : `Fill in the details below to create your ${currentProjectCount + 1}${getOrdinalSuffix(currentProjectCount + 1)} project.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Describe your project (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={e => handleInputChange('client_name', e.target.value)}
              placeholder="Client or company name (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency_code">Currency</Label>
              <Select
                value={formData.currency_code || undefined}
                onValueChange={value =>
                  handleInputChange('currency_code', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-gray-500">
                          ({currency.symbol})
                        </span>
                        <span className="text-gray-400">- {currency.name}</span>
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
                value={formData.price || ''}
                onChange={e =>
                  handleInputChange(
                    'price',
                    e.target.value ? parseFloat(e.target.value) : 0
                  )
                }
                placeholder="Enter amount (optional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate_type">Rate Type</Label>
            <Select
              value={formData.rate_type || undefined}
              onValueChange={value =>
                handleInputChange('rate_type', value as RateType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rate type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="fixed">Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status field - only show in edit mode */}
          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || undefined}
                onValueChange={value =>
                  handleInputChange('status', value as ProjectStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !hasChanges}
            >
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? hasChanges
                    ? 'Update Project'
                    : 'No Changes'
                  : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}
