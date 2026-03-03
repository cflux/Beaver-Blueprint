export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: 'concept' | 'active' | 'in_progress' | 'complete';
  category: string;
  goal: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  open_issues: number;
  closed_issues: number;
  progress: number;
  milestones_total: number;
  milestones_completed: number;
}

export interface Activity {
  id: number;
  project_id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  details: Record<string, unknown> | null;
  actor: string;
  created_at: string;
}

export interface Dashboard {
  projects: Project[];
  total_projects: number;
  active_projects: number;
  total_open_issues: number;
  recent_activity: Activity[];
}

export interface Plan {
  id: number;
  project_id: number;
  content: string;
  version: number;
  updated_at: string;
  updated_by: string;
}

export interface PlanVersion {
  id: number;
  plan_id: number;
  version: number;
  content: string;
  created_at: string;
  created_by: string;
}

export interface ResearchItem {
  id: number;
  project_id: number;
  title: string;
  url: string | null;
  notes: string;
  tag: string;
  created_at: string;
  created_by: string;
}

export interface Issue {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  created_by: string;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'open' | 'completed';
  created_at: string;
}

export interface ProgressEntry {
  id: number;
  project_id: number;
  milestone_id: number | null;
  note: string;
  percentage: number;
  created_at: string;
  created_by: string;
}

export interface Document {
  id: number;
  project_id: number;
  title: string;
  slug: string;
  content: string;
  category: 'guide' | 'api' | 'architecture' | 'runbook' | 'other';
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
}
