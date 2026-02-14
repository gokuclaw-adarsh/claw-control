export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  agentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AgentStatus = 'idle' | 'working' | 'offline';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  avatar?: string;
}

export interface Message {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface KanbanData {
  backlog: Task[];
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  completed: Task[];
}
