// Custom enum types matching our database schema
export type Status = 'new' | 'on_hold' | 'in_progress' | 'completed';
export type ProjectStatus = Status;
export type TaskStatus = Status;
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RateType = 'hourly' | 'monthly' | 'fixed';

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  subscription_status?: 'active' | 'inactive' | 'cancelled';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
  status: ProjectStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  user_id: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string;
  assignee?: string;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  project: {
    name: string;
    client_name?: string;
    status?: ProjectStatus;
  };
  assignee_user?: {
    name?: string;
    email: string;
  };
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  description?: string;
  is_running: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithDetails extends TimeEntry {
  task: Task;
  project: Project;
}

export interface ProjectWithStats extends Project {
  total_time_minutes: number;
  task_count: number;
  active_task_count: number;
}

export interface DashboardStats {
  total_projects: number;
  total_time_today: number;
  total_time_this_week: number;
  total_time_this_month: number;
  active_timers: number;
}

export interface OfflineData {
  pending_sync: TimeEntry[];
  last_sync: string;
  is_online: boolean;
}

// Utility types for forms and API requests
export interface CreateProjectRequest {
  name: string;
  description?: string;
  client_name?: string;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  client_name?: string;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
  status?: ProjectStatus;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  project_id: string;
  priority?: Priority;
  due_date?: string;
  assignee?: string | null;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: string;
  assignee?: string | null;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
}

export interface CreateTimeEntryRequest {
  task_id: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  description?: string;
}

export interface UpdateTimeEntryRequest {
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_running?: boolean;
}
