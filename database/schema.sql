-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for enums
CREATE TYPE project_status AS ENUM ('new', 'on_hold', 'in_progress', 'completed');
CREATE TYPE task_status AS ENUM ('new', 'on_hold', 'in_progress', 'completed');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE rate_type AS ENUM ('hourly', 'monthly', 'fixed');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  rate_type rate_type DEFAULT NULL,
  price DECIMAL(10,2) DEFAULT NULL,
  currency_code VARCHAR(3) DEFAULT NULL,
  status project_status DEFAULT 'new',
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
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
  assignee UUID REFERENCES public.users(id),
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
  CONSTRAINT check_duration_seconds_positive CHECK (duration_seconds >= 0),
  CONSTRAINT check_end_after_start CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT check_timer_status CHECK (timer_status IN ('running', 'paused', 'stopped')),
  CONSTRAINT check_status_end_time CHECK (
    (timer_status = 'stopped' AND end_time IS NOT NULL) OR 
    (timer_status IN ('running', 'paused') AND end_time IS NULL)
  ),
  CONSTRAINT unique_task_time_entry UNIQUE (task_id)
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

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
