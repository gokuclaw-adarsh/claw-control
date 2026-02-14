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

/** Default page size for completed tasks pagination */
const COMPLETED_PAGE_SIZE = 50;

/**
 * Hook for fetching and managing tasks with Kanban board structure.
 * Includes pagination for the completed column with infinite scroll.
 * @returns Object with tasks, kanban data, loading state, pagination state, and handlers
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Completed column pagination state
  const [completedOffset, setCompletedOffset] = useState(0);
  const [completedHasMore, setCompletedHasMore] = useState(true);
  const [completedLoadingMore, setCompletedLoadingMore] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      // Fetch non-completed tasks (all of them)
      const nonCompletedRes = await fetch(`${API_BASE}/api/tasks`);
      if (!nonCompletedRes.ok) throw new Error('Failed to fetch tasks');
      const nonCompletedData = await nonCompletedRes.json();
      const allTasks = Array.isArray(nonCompletedData) ? nonCompletedData : nonCompletedData.tasks || [];
      
      // Separate completed and non-completed
      const nonCompleted = allTasks.filter((t: Record<string, unknown>) => t.status !== 'completed');
      
      // Fetch first page of completed tasks with pagination
      const completedRes = await fetch(`${API_BASE}/api/tasks?status=completed&limit=${COMPLETED_PAGE_SIZE}&offset=0`);
      if (!completedRes.ok) throw new Error('Failed to fetch completed tasks');
      const completedData = await completedRes.json();
      const completedTasks = Array.isArray(completedData) ? completedData : completedData.tasks || [];
      
      // Combine non-completed with paginated completed
      const combined = [...nonCompleted, ...completedTasks];
      setTasks(combined.map(transformTask));
      
      // Update pagination state
      setCompletedOffset(completedTasks.length);
      setCompletedHasMore(completedTasks.length >= COMPLETED_PAGE_SIZE);
      
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

  /**
   * Load more completed tasks for infinite scroll.
   * Appends older completed tasks to the existing list.
   */
  const loadMoreCompleted = useCallback(async () => {
    if (completedLoadingMore || !completedHasMore) return;
    
    setCompletedLoadingMore(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks?status=completed&limit=${COMPLETED_PAGE_SIZE}&offset=${completedOffset}`);
      if (!res.ok) throw new Error('Failed to fetch more completed tasks');
      const data = await res.json();
      const newCompleted = Array.isArray(data) ? data : data.tasks || [];
      
      if (newCompleted.length < COMPLETED_PAGE_SIZE) {
        setCompletedHasMore(false);
      }
      
      if (newCompleted.length > 0) {
        const transformed = newCompleted.map(transformTask);
        setTasks(prev => {
          // Filter out duplicates and append new completed tasks
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNew = transformed.filter((t: Task) => !existingIds.has(t.id));
          return [...prev, ...uniqueNew];
        });
        setCompletedOffset(prev => prev + newCompleted.length);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCompletedLoadingMore(false);
    }
  }, [completedLoadingMore, completedHasMore, completedOffset]);

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

  return { 
    tasks, 
    setTasks, 
    kanban, 
    loading, 
    error, 
    refetch: fetchTasks, 
    moveTask,
    // Completed pagination exports
    loadMoreCompleted,
    completedLoadingMore,
    completedHasMore,
  };
}

/** Default page size for messages */
const MESSAGE_PAGE_SIZE = 40;

/**
 * Hook for fetching and managing agent messages with pagination.
 * Includes polling every 5 seconds for realtime updates.
 * @returns Object with messages array, loading state, pagination state, and handlers
 */
export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages?limit=${MESSAGE_PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      const rawMessages = Array.isArray(data) ? data : data.messages || [];
      const transformed = rawMessages.map(transformMessage);
      
      // Track the last message ID to detect new messages
      if (transformed.length > 0) {
        lastIdRef.current = transformed[transformed.length - 1].id;
      }
      
      // Reverse to chronological order (oldest first, newest last) for Slack-style display
      setMessages(transformed.reverse());
      setTotalLoaded(transformed.length);
      setHasMore(transformed.length >= MESSAGE_PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load more (older) messages with offset-based pagination.
   * Prepends older messages to the beginning of the array.
   */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const res = await fetch(`${API_BASE}/api/messages?limit=${MESSAGE_PAGE_SIZE}&offset=${totalLoaded}`);
      if (!res.ok) throw new Error('Failed to fetch more messages');
      const data = await res.json();
      const rawMessages = Array.isArray(data) ? data : data.messages || [];
      const transformed = rawMessages.map(transformMessage);
      
      if (transformed.length < MESSAGE_PAGE_SIZE) {
        setHasMore(false);
      }
      
      if (transformed.length > 0) {
        // Reverse to chronological order (oldest first)
        const chronological: Message[] = transformed.reverse();
        setMessages(prev => {
          // Filter duplicates and prepend older messages
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = chronological.filter((m: Message) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
        setTotalLoaded(prev => prev + transformed.length);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, totalLoaded]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Polling every 5 seconds for realtime updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchMessages]);

  /** Adds a new message, keeping only the last 200 messages */
  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      // Avoid duplicates by checking if message ID already exists
      if (prev.some(m => m.id === msg.id)) {
        return prev;
      }
      return [...prev.slice(-199), msg];
    });
  }, []);

  return { 
    messages, 
    setMessages, 
    loading, 
    loadingMore,
    hasMore,
    totalLoaded,
    error, 
    refetch: fetchMessages, 
    addMessage,
    loadMore
  };
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
