export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  subscription_status?: 'active' | 'inactive' | 'cancelled';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  client_name?: string;
  hourly_rate?: number;
  is_active: boolean;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
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
