export interface Task {
  id: string;
  title: string;
  due_at: string | null;
  state: 'To Do' | 'Done';
  priority: 'Alta' | 'Media' | 'Baja';
  inserted_at: string;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number | null;
  stage: string;
  probability: number | null;
  target_close_date: string | null;
  next_step: string | null;
  status: 'Open' | 'Won' | 'Lost';
  risk: string;
  contact_id: string | null;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  inserted_at: string;
}

export interface TimelineEntry {
  id: string;
  type: string;
  description: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  inserted_at: string;
}
