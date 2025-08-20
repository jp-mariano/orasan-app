'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateProjectRequest, RateType } from '@/types/index'

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProject: (data: CreateProjectRequest) => Promise<{ success: boolean; error?: string }>
  canCreateProject: boolean
  currentProjectCount: number
}

export function CreateProjectModal({ 
  open, 
  onOpenChange, 
  onCreateProject, 
  canCreateProject,
  currentProjectCount 
}: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    client_name: '',
    rate_type: 'hourly' as RateType,
    price: undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      return
    }

    setIsSubmitting(true)
    
    const result = await onCreateProject({
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      client_name: formData.client_name?.trim() || undefined,
      rate_type: formData.rate_type,
      price: formData.price,
    })

    setIsSubmitting(false)

    if (result.success) {
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        client_name: '',
        rate_type: 'hourly' as RateType,
        price: undefined,
      })
      onOpenChange(false)
    } else {
      // Handle error (you might want to show a toast or error message)
      console.error('Failed to create project:', result.error)
    }
  }

  const handleInputChange = (field: keyof CreateProjectRequest, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Show warning modal when project limit is reached
  if (!canCreateProject) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Limit Reached</DialogTitle>
            <DialogDescription>
              You have reached the maximum number of projects ({currentProjectCount}/2) for the free tier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              To create a new project, you can either:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 ml-4">
              <li>• Delete an existing project to make room</li>
              <li>• Upgrade your account for unlimited projects</li>
            </ul>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button>
              Upgrade Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to start tracking your time and tasks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Project description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => handleInputChange('client_name', e.target.value)}
              placeholder="Client or company name (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate_type">Rate Type</Label>
              <Select 
                value={formData.rate_type} 
                onValueChange={(value) => handleInputChange('rate_type', value as RateType)}
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

            <div className="space-y-2">
              <Label htmlFor="price">Rate/Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
