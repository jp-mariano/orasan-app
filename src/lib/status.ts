import { Project } from '@/types/index'

export const getStatusColor = (status: Project['status']) => {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800'
    case 'in_progress':
      return 'bg-green-100 text-green-800'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800'
    case 'completed':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getStatusLabel = (status: Project['status']) => {
  switch (status) {
    case 'new':
      return 'New'
    case 'in_progress':
      return 'In Progress'
    case 'on_hold':
      return 'On Hold'
    case 'completed':
      return 'Completed'
    default:
      return status
  }
}
