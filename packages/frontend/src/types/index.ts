/**
 * @fileoverview Type definitions for Claw Control frontend.
 * 
 * Defines TypeScript interfaces for tasks, agents, messages, and the
 * Kanban board data structure used throughout the application.
 * 
 * @module types
 */

/** Valid task status values representing Kanban columns */
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed';

/** Task entity representing a work item on the Kanban board */
export interface Task {
  id: string;
  title: string;
  description?: string;
  context?: string;
  attachments?: string[];
  deliverableType?: string;
  deliverableContent?: string;
  status: TaskStatus;
  agentId?: string;
  assigneesCount?: number;
  requires_approval?: boolean;
  approved_at?: string;
  approved_by?: string;
  subtaskCount?: number;
  subtaskDoneCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Valid agent status values */
export type AgentStatus = 'idle' | 'working' | 'offline';

/** Agent entity representing an AI agent in the system */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  avatar?: string;
  /** Agent biography */
  bio?: string;
  /** Guiding principles (JSON array) */
  principles?: string;
  /** Critical actions (JSON array) */
  critical_actions?: string;
  /** Communication style description */
  communication_style?: string;
  /** What this agent does (JSON array) */
  dos?: string;
  /** What this agent does NOT do (JSON array) */
  donts?: string;
  /** BMAD framework source reference */
  bmad_source?: string;
  /** Agent role */
  role?: string;
  /** Last heartbeat timestamp */
  last_heartbeat?: string;
  /** Computed liveness: online/stale/offline */
  liveness?: 'online' | 'stale' | 'offline';
}

/** Message entity representing an agent's activity log entry */
export interface Message {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

/** Kanban board data structure with tasks grouped by status */
export interface KanbanData {
  backlog: Task[];
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  completed: Task[];
}

/** Task assignee */
export interface TaskAssignee {
  id: string;
  task_id: string;
  agent_id: string;
  role: string;
  assigned_at: string;
  agent_name?: string;
  agent_avatar?: string;
  agent_status?: string;
}

/** Subtask on a task */
export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  status: 'todo' | 'done';
  agent_id?: string;
  position: number;
  created_at: string;
}

/** Comment on a task */
export interface Comment {
  id: string;
  task_id: string;
  agent_id: string;
  agent_name?: string;
  content: string;
  created_at: string;
}
