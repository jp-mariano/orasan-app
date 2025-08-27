'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CreateTaskRequest, Priority, Project, User } from '@/types'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  users?: User[]
  onSubmit: (taskData: CreateTaskRequest) => Promise<void>
}

export function CreateTaskModal({ 
  open, 
  onOpenChange, 
  project, 
  users = [], 
  onSubmit
}: CreateTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskRequest>({
    name: '',
    description: '',
    project_id: project.id,
    priority: 'low',
    due_date: undefined,
    assignee: undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if form is valid for submit button
  const isFormValid = formData.name.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})

    // Validate form
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required'
    }
    
    if (newErrors.name) {
      setErrors(newErrors)
      return
    }

    // Prepare task data, handling the "none" assignee value
    const taskData = {
      ...formData,
      assignee: formData.assignee === 'none' ? undefined : formData.assignee
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(taskData)
      // Reset form and close modal on success
      setFormData({
        name: '',
        description: '',
        project_id: project.id,
        priority: 'low',
        due_date: undefined,
        assignee: undefined
      })
      onOpenChange(false)
    } catch (error) {
      // Handle error (error will be handled by parent component)
      console.error('Error creating task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CreateTaskRequest, value: string | Priority | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const priorityOptions: { value: Priority; label: string; color: string }[] = [
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'low', label: 'Low', color: 'text-gray-600' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to &quot;{project.name}&quot; project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Task Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
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
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Priority) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => handleInputChange('due_date', date?.toISOString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              value={formData.assignee || undefined}
              onValueChange={(value) => handleInputChange('assignee', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No assignee</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
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
            <Button type="submit" disabled={isSubmitting || !isFormValid}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
