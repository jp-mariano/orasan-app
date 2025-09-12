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
import { ModalError } from '@/components/ui/modal-error';
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
  validatePricingConsistency,
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
      rate_type: undefined,
      price: undefined,
      currency_code: undefined,
      status: 'new', // Default status for new projects
    }),
    []
  );

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      if (isEditMode && project) {
        // Edit mode: reset to original project data
        setFormData({
          name: project.name,
          description: project.description || '',
          client_name: project.client_name || '',
          rate_type: project.rate_type || undefined,
          price: project.price,
          currency_code: project.currency_code || undefined,
          status: project.status,
        });
      } else {
        // Create mode: reset to defaults
        setFormData(defaultFormData);
      }
      setModifiedFields(new Set());
      setErrorMessage(null); // Clear error message when modal closes
      setNameError(null); // Clear name error when modal closes
    }
  }, [open, isEditMode, project, defaultFormData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

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
        rate_type: project.rate_type || undefined,
        price: project.price,
        currency_code: project.currency_code || undefined,
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

    // Clear any existing error messages
    setErrorMessage(null);
    setNameError(null);

    if (!formData.name.trim()) {
      setNameError('Project name is required');
      return;
    }

    // Validate pricing fields consistency
    const pricingValidation = validatePricingConsistency(
      convertRateTypeEmptyToNull(formData.rate_type),
      formData.price !== undefined ? formData.price : undefined,
      convertCurrencyEmptyToNull(formData.currency_code)
    );

    if (!pricingValidation.isValid) {
      setErrorMessage(pricingValidation.error!);
      return;
    }

    setIsSubmitting(true);

    let result: { success: boolean; error?: string };

    if (isEditMode && onUpdateProject) {
      // Edit mode - only include changed fields using object mapping
      const fieldMappings = {
        name: () => formData.name.trim(),
        description: () => formData.description?.trim() || undefined,
        client_name: () => formData.client_name?.trim() || undefined,
        rate_type: () => convertRateTypeEmptyToNull(formData.rate_type),
        price: () =>
          formData.price !== undefined ? formData.price : undefined,
        currency_code: () => convertCurrencyEmptyToNull(formData.currency_code),
        status: () => formData.status,
      } as const;

      const updateData: Partial<UpdateProjectRequest> = Object.fromEntries(
        Object.entries(fieldMappings)
          .filter(([field]) =>
            modifiedFields.has(field as keyof typeof fieldMappings)
          )
          .map(([field, getValue]) => [field, getValue()])
      );

      result = await onUpdateProject(updateData);
    } else if (!isEditMode && onCreateProject) {
      // Create mode - include all fields
      const createData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        client_name: formData.client_name?.trim() || undefined,
        rate_type: convertRateTypeEmptyToNull(formData.rate_type),
        price: formData.price !== undefined ? formData.price : undefined,
        currency_code: convertCurrencyEmptyToNull(formData.currency_code),
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

    // Clear error messages when user starts typing
    if (field === 'name' && nameError) {
      setNameError(null);
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
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

        {/* Error Message Display */}
        <ModalError
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />

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
              className={nameError ? 'border-red-500' : ''}
            />
            <ModalError
              errorMessage={nameError}
              onClose={() => setNameError(null)}
              variant="inline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Describe your project"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={e => handleInputChange('client_name', e.target.value)}
              placeholder="Client or company name"
            />
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
                <SelectItem value="fixed">Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              disabled={
                isSubmitting ||
                !formData.name.trim() ||
                !hasChanges ||
                !!nameError ||
                !!errorMessage
              }
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
