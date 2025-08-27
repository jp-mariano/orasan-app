'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Project } from '@/types/index'
import { getCurrencyByCode } from '@/lib/currencies'
import { getStatusColor, getStatusLabel } from '@/lib/status'
import { truncateTextSmart } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onNavigate?: (project: Project) => void
}

export function ProjectCard({ project, onEdit, onDelete, onNavigate }: ProjectCardProps) {
  const [showActions, setShowActions] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Auto-close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActions])

  const handleCardClick = () => {
    onNavigate?.(project)
  }





  const formatPrice = (price: number | null | undefined, rateType: string | null | undefined, currencyCode: string) => {
    if (!price || !rateType) return null
    
    const currency = getCurrencyByCode(currencyCode)
    if (!currency) return `${price}`

    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)

    switch (rateType) {
      case 'hourly':
        return `${currency.code} ${formatted}/hr`
      case 'monthly':
        return `${currency.code} ${formatted}/mo`
      case 'fixed':
        return `${currency.code} ${formatted}`
      default:
        return `${currency.code} ${formatted}`
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-full" onClick={handleCardClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold truncate">
                {project.name}
              </CardTitle>
              {project.client_name && (
                <CardDescription className="text-sm text-gray-600">
                  {project.client_name}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
            
            <div className="relative" ref={actionsRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation() // Prevent card click when clicking options
                  setShowActions(!showActions)
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // Prevent card click
                      onEdit?.(project)
                      setShowActions(false)
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation() // Prevent card click
                      onDelete?.(project)
                      setShowActions(false)
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1">
        {project.description && (
          <p className="text-sm text-gray-600">
            {truncateTextSmart(project.description, 80)}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 mt-auto">
        <div className="flex items-center justify-between text-sm w-full">
          <div className="text-gray-500">
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
          
          {formatPrice(project.price, project.rate_type, project.currency_code) && (
            <div className="font-medium text-green-600">
              {formatPrice(project.price, project.rate_type, project.currency_code)}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
