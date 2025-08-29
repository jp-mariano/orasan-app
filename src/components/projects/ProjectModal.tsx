'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  Project,
  RateType,
} from '@/types/index';
import { currencies, DEFAULT_CURRENCY } from '@/lib/currencies';

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    client_name: '',
    rate_type: 'hourly' as RateType,
    price: 0,
    currency_code: DEFAULT_CURRENCY,
  });

  // Initialize form data when project changes (for edit mode)
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        client_name: project.client_name || '',
        rate_type: project.rate_type || 'hourly',
        price: project.price || 0,
        currency_code: project.currency_code || DEFAULT_CURRENCY,
      });
    } else {
      // Reset to defaults for create mode
      setFormData({
        name: '',
        description: '',
        client_name: '',
        rate_type: 'hourly' as RateType,
        price: 0,
        currency_code: DEFAULT_CURRENCY,
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    let result: { success: boolean; error?: string };

    if (isEditMode && onUpdateProject) {
      // Edit mode
      result = await onUpdateProject({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        client_name: formData.client_name?.trim() || undefined,
        rate_type: formData.rate_type || undefined,
        price: formData.price || undefined,
        currency_code: formData.currency_code || undefined,
      });
    } else if (!isEditMode && onCreateProject) {
      // Create mode
      result = await onCreateProject({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        client_name: formData.client_name?.trim() || undefined,
        rate_type: formData.rate_type || undefined,
        price: formData.price || undefined,
        currency_code: formData.currency_code || undefined,
      });
    } else {
      result = { success: false, error: 'Invalid operation' };
    }

    setIsSubmitting(false);

    if (result.success) {
      // Close modal on success
      onOpenChange(false);
    } else {
      // Handle error (you might want to show a toast or error message)
      console.error(
        `Failed to ${isEditMode ? 'update' : 'create'} project:`,
        result.error
      );
    }
  };

  const handleInputChange = (
    field: keyof CreateProjectRequest,
    value: string | number | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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
                value={formData.currency_code || ''}
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
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate_type">Rate Type</Label>
            <Select
              value={formData.rate_type || ''}
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
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Project'
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
