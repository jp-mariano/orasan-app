import { Project } from '@/types/index';

export const getStatusColor = (status: Project['status']) => {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_progress':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusLabel = (status: Project['status']) => {
  switch (status) {
    case 'new':
      return 'New';
    case 'in_progress':
      return 'In Progress';
    case 'on_hold':
      return 'On Hold';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

// Helper function to get status options for select components
export const getStatusOptions = () => [
  {
    value: 'new' as Project['status'],
    label: getStatusLabel('new'),
    color: 'text-blue-600',
  },
  {
    value: 'in_progress' as Project['status'],
    label: getStatusLabel('in_progress'),
    color: 'text-green-600',
  },
  {
    value: 'on_hold' as Project['status'],
    label: getStatusLabel('on_hold'),
    color: 'text-yellow-600',
  },
  {
    value: 'completed' as Project['status'],
    label: getStatusLabel('completed'),
    color: 'text-gray-600',
  },
];
