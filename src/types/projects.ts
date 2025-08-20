// Re-export types from index.ts to avoid duplication
export type { 
  Project, 
  CreateProjectRequest as CreateProjectData, 
  UpdateProjectRequest as UpdateProjectData 
} from './index'

export interface ProjectLimitInfo {
  current: number
  limit: number
  message: string
}

export interface ProjectApiResponse {
  projects?: import('./index').Project[]
  project?: import('./index').Project
  message?: string
  error?: string
  details?: ProjectLimitInfo
}
