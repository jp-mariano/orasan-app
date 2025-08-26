'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronRight
} from 'lucide-react'
import { TaskWithDetails } from '@/types'
import { TaskCard } from './TaskCard'
import { getPriorityBorderColor } from '@/lib/status'

interface TaskListProps {
  tasks: TaskWithDetails[]
  loading?: boolean
  onEdit?: (task: TaskWithDetails) => void
  onDelete?: (task: TaskWithDetails) => void
  onNavigate?: (task: TaskWithDetails) => void
}

interface PriorityGroup {
  priority: 'urgent' | 'high' | 'medium' | 'low'
  label: string
  color: string
  expanded: boolean
}

export function TaskList({ 
  tasks, 
  loading = false, 
  onEdit, 
  onDelete, 
  onNavigate
}: TaskListProps) {
  const [expandedPriorities, setExpandedPriorities] = useState<Set<string>>(new Set(['urgent']))

  // Define priority groups with their properties
  const priorityGroups: PriorityGroup[] = [
    {
      priority: 'urgent',
      label: 'Urgent',
      color: 'text-red-600',
      expanded: expandedPriorities.has('urgent')
    },
    {
      priority: 'high',
      label: 'High Priority',
      color: 'text-orange-600',
      expanded: expandedPriorities.has('high')
    },
    {
      priority: 'medium',
      label: 'Medium Priority',
      color: 'text-blue-600',
      expanded: expandedPriorities.has('medium')
    },
    {
      priority: 'low',
      label: 'Low Priority',
      color: 'text-gray-600',
      expanded: expandedPriorities.has('low')
    }
  ]

  const togglePriority = (priority: string) => {
    setExpandedPriorities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(priority)) {
        newSet.delete(priority)
      } else {
        newSet.add(priority)
      }
      return newSet
    })
  }

  const getTasksByPriority = (priority: string) => {
    return tasks.filter(task => task.priority === priority)
  }

  const getTotalTasksByPriority = (priority: string) => {
    return getTasksByPriority(priority).length
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {priorityGroups.map((group) => (
              <div key={group.priority} className="border-l-4 pl-3" style={{
                borderLeftColor: getPriorityBorderColor(group.priority)
              }}>
                <div className="flex items-center gap-2 p-1 mb-1">
                  <div className="h-3 w-3 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  <div className="h-3 w-5 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-0.5 ml-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">No tasks yet</h3>
              <p className="text-gray-500 mt-1">Get started by creating your first task</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tasks</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {priorityGroups.map((group) => {
            const priorityTasks = getTasksByPriority(group.priority)
            const taskCount = getTotalTasksByPriority(group.priority)
            const isExpanded = expandedPriorities.has(group.priority)

            if (taskCount === 0) return null

            return (
              <div key={group.priority} className="border-l-4 pl-3" style={{
                borderLeftColor: getPriorityBorderColor(group.priority)
              }}>
                {/* Priority Header */}
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded mb-1"
                  onClick={() => togglePriority(group.priority)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{group.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                    </Badge>
                  </div>
                </div>
                
                {/* Tasks */}
                {isExpanded && (
                  <div className="space-y-0.5 ml-6">
                    {priorityTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
