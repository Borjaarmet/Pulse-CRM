// Enums
export type TaskState = 'To Do' | 'Doing' | 'Waiting' | 'Done';
export type TaskPriority = 'Baja' | 'Media' | 'Alta';
export type DealStatus = 'Open' | 'Won' | 'Lost';
export type Priority = 'Cold' | 'Warm' | 'Hot';
export type RiskLevel = 'Bajo' | 'Medio' | 'Alto';

// Core interfaces
export interface User {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  revenue_estimate?: number;
  location?: string;
  website?: string;
  description?: string;
  score: number;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_id?: string;
  company?: string; // Cambio: company es string, no Company
  position?: string;
  source?: string;
  score: number;
  priority: Priority;
  last_activity?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  companyData?: Company; // Relación con la entidad Company
}

export interface Deal {
  id: string;
  title: string;
  company?: string;
  amount?: number;
  stage: string;
  probability: number;
  target_close_date?: string;
  next_step?: string;
  status: DealStatus;
  score: number;
  priority: Priority;
  risk_level: RiskLevel;
  last_activity?: string;
  inactivity_days: number;
  contact_id?: string;
  owner_id?: string;
  close_reason?: string;
  created_at: string;
  updated_at: string;
  // Relations
  contact?: Contact;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  state: TaskState;
  priority: TaskPriority;
  due_at?: string;
  completed_at?: string;
  assigned_to?: string;
  deal_id?: string;
  contact_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  deal?: Deal;
  contact?: Contact;
}

export interface TimelineEntry {
  id: string;
  type: string;
  description: string;
  entity_type: string;
  entity_id: string;
  user_id?: string;
  metadata?: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

// Scoring interfaces
export interface ScoringFactors {
  probability: number;
  amount: number;
  activity: number;
  stage: number;
  timeInStage: number;
  lastActivity: number;
}

export interface ScoringResult {
  score: number;
  priority: Priority;
  factors: ScoringFactors;
  reasoning: string[];
}

// UI specific interfaces
export interface ScoreBadgeProps {
  score: number;
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
}
