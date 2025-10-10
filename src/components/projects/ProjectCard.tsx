'use client';

import { useEffect, useRef, useState } from 'react';

import { MoreVertical, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCurrencyByCode } from '@/lib/currencies';
import { getStatusColor, getStatusLabel } from '@/lib/status';
import { formatDate, getProjectColor, truncateTextSmart } from '@/lib/utils';
import { Project } from '@/types/index';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onNavigate?: (project: Project) => void;
  onUpdate?: (projectId: string, updates: Partial<Project>) => Promise<void>;
}

export function ProjectCard({
  project,
  onDelete,
  onNavigate,
  onUpdate,
}: ProjectCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Auto-close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  const handleCardClick = () => {
    onNavigate?.(project);
  };

  const handleMarkAsCompleted = async () => {
    if (!onUpdate || project.status === 'completed') return;

    try {
      setIsUpdating(true);
      await onUpdate(project.id, { status: 'completed' });
      setShowActions(false);
    } catch (error) {
      console.error('Failed to mark project as completed:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPrice = (
    price: number | null | undefined,
    rateType: string | null | undefined,
    currencyCode: string | null | undefined
  ) => {
    if (price === null || price === undefined || !rateType || !currencyCode)
      return null;

    const currency = getCurrencyByCode(currencyCode);
    if (!currency) return `${price}`;

    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

    switch (rateType) {
      case 'hourly':
        return `${currency.code} ${formatted}/hr`;
      case 'monthly':
        return `${currency.code} ${formatted}/mo`;
      case 'fixed':
        return `${currency.code} ${formatted}`;
      default:
        return `${currency.code} ${formatted}`;
    }
  };

  const projectColor = getProjectColor(project.id);

  return (
    <Card
      className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-full"
      onClick={handleCardClick}
    >
      {/* Project Color Indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: projectColor }}
      />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold">
                {truncateTextSmart(project.name, 40)}
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
                onClick={e => {
                  e.stopPropagation(); // Prevent card click when clicking options
                  setShowActions(!showActions);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {showActions && (
                <div className="absolute right-0 top-8 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[120px]">
                  {/* Mark as Completed - Only show for non-completed projects */}
                  {project.status !== 'completed' && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleMarkAsCompleted();
                      }}
                      disabled={isUpdating}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>
                        {isUpdating ? 'Marking...' : 'Mark as Completed'}
                      </span>
                    </button>
                  )}

                  {/* Delete Action */}
                  <div className="border-t my-1"></div>
                  <button
                    onClick={e => {
                      e.stopPropagation(); // Prevent card click
                      onDelete?.(project);
                      setShowActions(false);
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

      <CardContent className="flex-1">
        {project.description && (
          <p className="text-sm text-gray-600">
            {truncateTextSmart(project.description, 80)}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex items-center justify-between text-sm w-full">
          <div className="text-gray-500">
            Created: {formatDate(project.created_at)}
          </div>

          {formatPrice(
            project.price,
            project.rate_type,
            project.currency_code
          ) && (
            <div className="font-medium text-green-600">
              {formatPrice(
                project.price,
                project.rate_type,
                project.currency_code
              )}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
