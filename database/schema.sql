-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for enums
CREATE TYPE project_status AS ENUM ('new', 'on_hold', 'in_progress', 'completed');
CREATE TYPE task_status AS ENUM ('new', 'on_hold', 'in_progress', 'completed');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE rate_type AS ENUM ('hourly', 'monthly', 'fixed');
CREATE TYPE activity_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'EXPORT_DATA', 'REQUEST_ACCOUNT_DELETION', 'CONFIRM_ACCOUNT_DELETION', 'CANCEL_ACCOUNT_DELETION');
CREATE TYPE activity_entity_type AS ENUM ('project', 'task', 'time_entry', 'work_session', 'invoice', 'user', 'data_export', 'account_deletion');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
  -- Business information for invoicing
  business_name TEXT,
  business_email TEXT,
  business_address TEXT,
  business_phone TEXT,
  tax_id TEXT,
  -- Account deletion tracking
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_confirmed_at TIMESTAMP WITH TIME ZONE,
  deletion_token TEXT,
  deletion_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rate_type rate_type DEFAULT NULL,
  price DECIMAL(10,2) DEFAULT NULL,
  currency_code VARCHAR(3) DEFAULT NULL,
  status project_status DEFAULT 'new',
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  -- Client information for invoicing
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  client_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Allow NULL for unpriced projects, or positive prices
  CONSTRAINT price_consistency CHECK (price IS NULL OR price >= 0),
  -- Ensure pricing fields are all populated together or all NULL
  CONSTRAINT pricing_fields_consistency CHECK (
    (price IS NULL AND currency_code IS NULL AND rate_type IS NULL) OR
    (price IS NOT NULL AND currency_code IS NOT NULL AND rate_type IS NOT NULL)
  )
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status task_status DEFAULT 'new',
  priority priority NOT NULL DEFAULT 'low',
  due_date DATE,
  assignee UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Rate information at task creation time (locked after creation)
  rate_type rate_type DEFAULT NULL,
  price DECIMAL(10,2) DEFAULT NULL,
  currency_code VARCHAR(3) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Allow NULL for unpriced tasks, or positive prices
  CONSTRAINT price_consistency CHECK (price IS NULL OR price >= 0),
  -- Ensure pricing fields are all populated together or all NULL
  CONSTRAINT pricing_fields_consistency CHECK (
    (price IS NULL AND currency_code IS NULL AND rate_type IS NULL) OR
    (price IS NOT NULL AND currency_code IS NOT NULL AND rate_type IS NOT NULL)
  ),
  -- Ensure valid priority values
  CONSTRAINT valid_task_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0 NOT NULL,
  timer_status VARCHAR(20) DEFAULT 'paused' CHECK (timer_status IN ('running', 'paused', 'stopped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints for data integrity
  -- Multiple time entries per task are allowed for invoice generation workflows
  CONSTRAINT check_duration_seconds_positive CHECK (duration_seconds >= 0),
  CONSTRAINT check_end_after_start CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT check_timer_status CHECK (timer_status IN ('running', 'paused', 'stopped')),
  CONSTRAINT check_status_end_time CHECK (
    (timer_status = 'stopped') OR 
    (timer_status IN ('running', 'paused') AND end_time IS NULL)
  )
);

-- Create work_sessions table
CREATE TABLE public.work_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0 NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints for data integrity
  CONSTRAINT check_work_session_duration_positive CHECK (duration_seconds >= 0),
  CONSTRAINT check_work_session_end_after_start CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT check_work_session_status CHECK (status IN ('active', 'completed')),
  CONSTRAINT check_work_session_status_end_time CHECK (
    (status = 'completed' AND end_time IS NOT NULL) OR 
    (status = 'active' AND end_time IS NULL)
  )
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms TEXT DEFAULT 'NET 30',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure positive amounts
  CONSTRAINT check_invoice_amounts_positive CHECK (
    subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0
  ),
  -- Ensure total matches subtotal + tax
  CONSTRAINT check_invoice_total_calculation CHECK (
    total_amount = subtotal + tax_amount
  )
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure positive amounts
  CONSTRAINT check_invoice_item_amounts_positive CHECK (
    quantity > 0 AND unit_cost >= 0 AND total_cost >= 0
  ),
  -- Ensure total matches quantity * unit_cost
  CONSTRAINT check_invoice_item_total_calculation CHECK (
    total_cost = quantity * unit_cost
  )
);

-- Create user_activity_log table
CREATE TABLE public.user_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action activity_action NOT NULL,
  entity_type activity_entity_type NOT NULL,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Track when user was deleted (set by cleanup job before user deletion)
  user_deleted_at TIMESTAMP WITH TIME ZONE,
  -- Ensure user_deleted_at is only set when user_id is NULL
  CONSTRAINT check_user_deleted_at_consistency CHECK (
    (user_id IS NULL AND user_deleted_at IS NOT NULL) OR
    (user_id IS NOT NULL AND user_deleted_at IS NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_user_status ON public.time_entries(user_id, timer_status);
CREATE INDEX idx_time_entries_task_status ON public.time_entries(task_id, timer_status);
CREATE INDEX idx_time_entries_created_at ON public.time_entries(created_at);
CREATE INDEX idx_time_entries_start_time ON public.time_entries(start_time);
CREATE INDEX idx_work_sessions_user_id ON public.work_sessions(user_id);
CREATE INDEX idx_work_sessions_status ON public.work_sessions(status);
CREATE INDEX idx_work_sessions_start_time ON public.work_sessions(start_time);
CREATE INDEX idx_work_sessions_user_status ON public.work_sessions(user_id, status);
-- Invoice indexes
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_user_invoice_number ON public.invoices(user_id, invoice_number);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_task_id ON public.invoice_items(task_id);
-- Account deletion cleanup index
CREATE INDEX idx_users_deletion_confirmed ON public.users(deletion_confirmed_at) 
WHERE deletion_confirmed_at IS NOT NULL;
-- User activity log indexes
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_action ON public.user_activity_log(action);
CREATE INDEX idx_user_activity_log_entity_type ON public.user_activity_log(entity_type);
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log(created_at);
CREATE INDEX idx_user_activity_log_user_deleted_at ON public.user_activity_log(user_deleted_at)
WHERE user_deleted_at IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE USING ((SELECT auth.uid()) = id);

-- RLS Policies for projects table
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for tasks table
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for time_entries table
CREATE POLICY "Users can view own time entries" ON public.time_entries
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own time entries" ON public.time_entries
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own time entries" ON public.time_entries
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own time entries" ON public.time_entries
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for work_sessions table
CREATE POLICY "Users can view own work sessions" ON public.work_sessions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own work sessions" ON public.work_sessions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own work sessions" ON public.work_sessions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own work sessions" ON public.work_sessions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for invoices table
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own invoices" ON public.invoices
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- RLS Policies for invoice_items table
CREATE POLICY "Users can view own invoice items" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own invoice items" ON public.invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own invoice items" ON public.invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own invoice items" ON public.invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policies for user_activity_log table
-- Users can view their own activity logs (only when user_id is not NULL)
CREATE POLICY "Users can view own activity logs" ON public.user_activity_log
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id AND user_id IS NOT NULL
  );

-- Only system can insert activity logs (via API with service role or triggers)
-- Note: This policy allows inserts when authenticated, but we'll control this via API-level checks
CREATE POLICY "System can insert activity logs" ON public.user_activity_log
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id OR user_id IS NULL
  );

-- Users cannot update or delete their own activity logs (immutable audit trail)
CREATE POLICY "Activity logs are immutable" ON public.user_activity_log
  FOR UPDATE USING (false);

CREATE POLICY "Activity logs cannot be deleted" ON public.user_activity_log
  FOR DELETE USING (false);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to set user_deleted_at on activity logs when user is deleted
CREATE OR REPLACE FUNCTION set_user_deleted_at_on_logs()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user is about to be deleted, set user_deleted_at on all their activity logs
  -- This happens BEFORE deletion, so the user_id still exists for the WHERE clause
  UPDATE public.user_activity_log
  SET user_deleted_at = NOW(), user_id = NULL
  WHERE user_id = OLD.id AND user_deleted_at IS NULL;
  
  RETURN OLD;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Create trigger to set user_deleted_at before user deletion
CREATE TRIGGER set_user_deleted_at_before_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_deleted_at_on_logs();
