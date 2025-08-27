'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Square,
  User,
  MoreVertical
} from 'lucide-react'
import { TaskWithDetails } from '@/types'
import { getStatusColor, getStatusLabel } from '@/lib/status'
import { formatDate } from '@/lib/utils'

interface TaskCardProps {
  task: TaskWithDetails
  onDelete?: (task: TaskWithDetails) => void
}

export function TaskCard({ task, onDelete }: TaskCardProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handlePlayPause = () => {
    setIsTimerRunning(!isTimerRunning)
    // TODO: Implement actual time tracking
  }

  const handleStop = () => {
    setIsTimerRunning(false)
    // TODO: Implement actual time tracking
  }

  const handleEdit = () => {
    // Navigate to task page for editing
    window.location.href = `/dashboard/tasks/${task.id}`
  }

  const handleDelete = () => {
    onDelete?.(task)
  }



  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group mb-3"
      onClick={() => window.location.href = `/dashboard/tasks/${task.id}`}
    >
      <CardContent>
        <div className="flex items-center justify-between">
          {/* Task Info */}
          <div className="flex-1">
            {/* Task Name */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate text-sm">{task.name}</h3>
            </div>

            {/* Additional Details Row */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <span>Due: {formatDate(task.due_date)}</span>
                </div>
              )}

              {/* Assignee */}
              {task.assignee_user && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{task.assignee_user.name || task.assignee_user.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge and Actions */}
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(task.status)}>
              {getStatusLabel(task.status)}
            </Badge>
            
            <div className="relative" ref={actionsRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation() // Prevent card click when clicking options
                  setShowActions(!showActions)
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                  {/* Time Tracking Actions - Only show for non-completed tasks */}
                  {task.status !== 'completed' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayPause()
                          setShowActions(false)
                        }}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        {!isTimerRunning ? (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Start Timer</span>
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4" />
                            <span>Pause Timer</span>
                          </>
                        )}
                      </button>
                      
                      {isTimerRunning && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStop()
                            setShowActions(false)
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <Square className="h-4 w-4" />
                          <span>Stop Timer</span>
                        </button>
                      )}
                      
                      <div className="border-t my-1"></div>
                    </>
                  )}
                  
                  {/* Edit Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit()
                      setShowActions(false)
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Task</span>
                  </button>
                  
                  {/* Delete Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete()
                      setShowActions(false)
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Task</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
