// Custom enum types matching our database schema
export type Status = 'new' | 'on_hold' | 'in_progress' | 'completed';
export type ProjectStatus = Status;
export type TaskStatus = Status;
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type RateType = 'hourly' | 'monthly' | 'fixed';
export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT_DATA'
  | 'REQUEST_ACCOUNT_DELETION'
  | 'CONFIRM_ACCOUNT_DELETION'
  | 'CANCEL_ACCOUNT_DELETION';
export type ActivityEntityType =
  | 'project'
  | 'task'
  | 'time_entry'
  | 'work_session'
  | 'invoice'
  | 'user'
  | 'data_export'
  | 'account_deletion';

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
  subscription_tier?: 'free' | 'pro' | 'enterprise';
  subscription_status?: 'active' | 'inactive' | 'cancelled';
  // Business information for invoicing
  business_name?: string;
  business_email?: string;
  business_address?: string;
  business_phone?: string;
  tax_id?: string;
  // Account deletion tracking
  deletion_requested_at?: string;
  deletion_confirmed_at?: string;
  deletion_token?: string;
  deletion_token_expires_at?: string;
}

export interface UpdateUserRequest {
  name?: string;
  business_name?: string;
  business_email?: string;
  business_address?: string;
  business_phone?: string;
  tax_id?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  client_phone?: string;
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
  duration_seconds: number;
  timer_status: 'running' | 'paused' | 'stopped';
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithDetails extends TimeEntry {
  task: Task;
  project: Project;
}

export interface ProjectWithStats extends Project {
  total_time_seconds: number;
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
  client_email?: string;
  client_address?: string;
  client_phone?: string;
  rate_type?: RateType | null;
  price?: number | null;
  currency_code?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  client_phone?: string;
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
  duration_seconds: number;
  description?: string;
}

export interface UpdateTimeEntryRequest {
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  timer_status?: 'running' | 'paused' | 'stopped';
}

export interface UserActivityLog {
  id: string;
  user_id: string | null;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  created_at: string;
  user_deleted_at: string | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  user_id: string;
  project_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string;
  payment_terms: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  task_id?: string | null;
  name: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  rate_type?: RateType | null;
  created_at: string;
}

export interface InvoiceWithDetails extends Invoice {
  project: Project;
  items: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  invoice_number?: string; // Optional - will auto-generate if not provided
  project_id: string;
  issue_date: string;
  due_date?: string;
  payment_terms?: string;
  tax_rate?: number;
  currency_code?: string;
  notes?: string;
  date_range: {
    from: string;
    to: string;
  };
}

export interface UpdateInvoiceRequest {
  invoice_number?: string;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string;
  payment_terms?: string;
  tax_rate?: number;
  currency_code?: string;
  notes?: string;
  items?: Array<{
    id?: string; // Optional - if not provided, will be treated as new item
    task_id?: string | null;
    name: string;
    description?: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    rate_type?: RateType | null;
  }>;
}
