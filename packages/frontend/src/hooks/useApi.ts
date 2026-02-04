/**
 * @fileoverview API hooks for data fetching and real-time updates.
 * 
 * Provides React hooks for interacting with the Claw Control backend API:
 * - useAgents: Fetches and manages agent data
 * - useTasks: Fetches tasks and provides Kanban board structure
 * - useMessages: Fetches agent activity messages
 * - useSSE: Server-Sent Events for real-time updates
 * 
 * @module hooks/useApi
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Agent, Task, Message, KanbanData, TaskStatus } from '../types';

/** 
 * Base URL for API requests.
 * Priority: 1) Runtime config (window.__CLAW_CONFIG__) 2) Build-time env 3) Same-origin
 */
declare global {
  interface Window {
    __CLAW_CONFIG__?: { API_URL?: string };
  }
}
const API_BASE = window.__CLAW_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '';

/**
 * Transforms raw API task data to typed Task object.
 * Handles snake_case to camelCase conversion.
 * @param apiTask - Raw task object from API
 * @returns Typed Task object
 */
export function transformTask(apiTask: Record<string, unknown>): Task {
  return {
    id: String(apiTask.id),
    title: String(apiTask.title || ''),
    description: String(apiTask.description || ''),
    status: (apiTask.status as TaskStatus) || 'backlog',
    agentId: apiTask.agent_id ? String(apiTask.agent_id) : undefined,
    createdAt: String(apiTask.created_at || new Date().toISOString()),
    updatedAt: String(apiTask.updated_at || new Date().toISOString()),
  };
}

/**
 * Transforms raw API agent data to typed Agent object.
 * @param apiAgent - Raw agent object from API
 * @returns Typed Agent object
 */
export function transformAgent(apiAgent: Record<string, unknown>): Agent {
  return {
    id: String(apiAgent.id),
    name: String(apiAgent.name || ''),
    description: String(apiAgent.description || ''),
    status: (apiAgent.status as Agent['status']) || 'idle',
    avatar: apiAgent.avatar ? String(apiAgent.avatar) : undefined,
  };
}

/**
 * Transforms raw API message data to typed Message object.
 * @param apiMsg - Raw message object from API
 * @returns Typed Message object
 */
export function transformMessage(apiMsg: Record<string, unknown>): Message {
  const ts = String(apiMsg.created_at ?? apiMsg.timestamp ?? new Date().toISOString());
  return {
    id: String(apiMsg.id ?? apiMsg.Id ?? ''),
    agentId: String(apiMsg.agent_id ?? apiMsg.agentId ?? ''),
    agentName: String(apiMsg.agent_name ?? apiMsg.agentName ?? 'Unknown'),
    content: String(apiMsg.message ?? apiMsg.content ?? ''),
    timestamp: ts,
    type: (apiMsg.type as Message['type']) ?? 'info',
  };
}

/**
 * Hook for fetching and managing agents.
 * @returns Object with agents array, loading state, and setter
 */
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents`);
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      const rawAgents = Array.isArray(data) ? data : data.agents || [];
      setAgents(rawAgents.map(transformAgent));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, setAgents, loading, error, refetch: fetchAgents };
}

/**
 * Hook for fetching and managing tasks with Kanban board structure.
 * @returns Object with tasks, kanban data, loading state, and move handler
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      const rawTasks = Array.isArray(data) ? data : data.tasks || [];
      setTasks(rawTasks.map(transformTask));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /** Kanban board data structure with tasks grouped by status */
  const kanban: KanbanData = {
    backlog: tasks.filter(t => t.status === 'backlog'),
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  /**
   * Moves a task to a new status column.
   * Updates local state optimistically and syncs with API.
   */
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
    
    try {
      await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on error by refetching
      fetchTasks();
    }
  }, [fetchTasks]);

  return { tasks, setTasks, kanban, loading, error, refetch: fetchTasks, moveTask };
}

/**
 * Hook for fetching and managing agent messages.
 * @returns Object with messages array, loading state, and add handler
 */
export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      const rawMessages = Array.isArray(data) ? data : data.messages || [];
      setMessages(rawMessages.map(transformMessage));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /** Adds a new message, keeping only the last 200 messages */
  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev.slice(-199), msg]);
  }, []);

  return { messages, setMessages, loading, error, refetch: fetchMessages, addMessage };
}

/**
 * Hook for Server-Sent Events real-time updates.
 * Connects to the SSE stream and dispatches updates to provided handlers.
 * 
 * @param onAgent - Handler for agent create/update events
 * @param onTask - Handler for task create/update/delete events
 * @param onMessage - Handler for new message events
 * @param onInit - Handler for initial data load
 * @returns Object with connection status
 */
export function useSSE(
  onAgent?: (agent: Agent, action?: 'created' | 'updated') => void,
  onTask?: (task: Task | { id: string }, action?: 'created' | 'updated' | 'deleted') => void,
  onMessage?: (message: Message) => void,
  onInit?: (data: { tasks: Task[]; agents: Agent[] }) => void
) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    // Initial state event
    eventSource.addEventListener('init', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onInit?.(data);
      } catch { /* ignore parse errors */ }
    });

    // Agent events
    eventSource.addEventListener('agent-created', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onAgent?.(transformAgent(data), 'created');
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('agent-updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onAgent?.(transformAgent(data), 'updated');
      } catch { /* ignore parse errors */ }
    });

    // Task events
    eventSource.addEventListener('task-created', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onTask?.(transformTask(data), 'created');
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('task-updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onTask?.(transformTask(data), 'updated');
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('task-deleted', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onTask?.({ id: String(data.id) }, 'deleted');
      } catch { /* ignore parse errors */ }
    });

    // Message events
    eventSource.addEventListener('message-created', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onMessage?.(transformMessage(data));
      } catch { /* ignore parse errors */ }
    });

    // Legacy event names for backward compatibility
    eventSource.addEventListener('agent', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onAgent?.(transformAgent(data), 'updated');
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('task', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onTask?.(transformTask(data), 'updated');
      } catch { /* ignore parse errors */ }
    });

    eventSource.addEventListener('message', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onMessage?.(transformMessage(data));
      } catch { /* ignore parse errors */ }
    });

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [onAgent, onTask, onMessage, onInit]);

  return { connected };
}
