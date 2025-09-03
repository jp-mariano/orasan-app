import { Priority } from '@/types';

export const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getPriorityLabel = (priority: Priority) => {
  switch (priority) {
    case 'urgent':
      return 'Urgent';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return priority;
  }
};

export const getPriorityBorderColor = (priority: Priority) => {
  switch (priority) {
    case 'urgent':
      return 'oklch(0.577 0.245 27.325)'; // red-500 equivalent, matching destructive
    case 'high':
      return 'oklch(0.828 0.189 84.429)'; // orange-500 equivalent, matching chart-4
    case 'medium':
      return 'oklch(0.398 0.07 227.392)'; // blue-500 equivalent, matching chart-3
    case 'low':
      return 'oklch(0.556 0 0)'; // gray-500 equivalent, matching muted-foreground
    default:
      return 'oklch(0.556 0 0)'; // gray-500 equivalent
  }
};

// Helper function to get priority options for select components
export const getPriorityOptions = () => [
  {
    value: 'urgent' as Priority,
    label: getPriorityLabel('urgent'),
    color: 'text-red-600',
  },
  {
    value: 'high' as Priority,
    label: getPriorityLabel('high'),
    color: 'text-orange-600',
  },
  {
    value: 'medium' as Priority,
    label: getPriorityLabel('medium'),
    color: 'text-blue-600',
  },
  {
    value: 'low' as Priority,
    label: getPriorityLabel('low'),
    color: 'text-gray-600',
  },
];

// Helper function to get priority groups for TaskList component
export const getPriorityGroups = () => [
  {
    priority: 'urgent' as Priority,
    label: 'Urgent',
    color: 'text-red-600',
  },
  {
    priority: 'high' as Priority,
    label: 'High Priority',
    color: 'text-orange-600',
  },
  {
    priority: 'medium' as Priority,
    label: 'Medium Priority',
    color: 'text-blue-600',
  },
  {
    priority: 'low' as Priority,
    label: 'Low Priority',
    color: 'text-gray-600',
  },
];
