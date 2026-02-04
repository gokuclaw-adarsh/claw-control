/**
 * @fileoverview Main Application Component.
 * 
 * Root component for Claw Control. Provides:
 * - Dashboard with responsive layout:
 *   - Header with connection status indicator
 *   - Agents list sidebar (left panel)
 *   - Kanban board (center)
 *   - Agent chat/feed (right panel)
 *   - Mobile navigation with tab switching
 * 
 * Manages real-time state updates via SSE and coordinates data flow
 * between child components.
 * 
 * @module App
 */

import { useCallback, useState } from 'react';
import { Radio, Wifi, WifiOff, Bot, LayoutGrid, MessageSquare } from 'lucide-react';
import { AgentsList } from './components/AgentsList';
import { KanbanBoard } from './components/KanbanBoard';
import { AgentChat } from './components/AgentChat';
import { useAgents, useTasks, useMessages, useSSE, transformAgent, transformTask } from './hooks/useApi';
import type { Agent, Task, Message, TaskStatus } from './types';

/** Mobile view tab options */
type MobileView = 'agents' | 'board' | 'chat';

/**
 * Application header with logo and connection status.
 * @param props.connected - Whether SSE connection is active
 */
function Header({ connected }: { connected: boolean }) {
  return (
    <header className="h-12 sm:h-14 px-3 sm:px-4 border-b border-cyber-green/30 bg-black/50 flex items-center justify-between backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-cyber-green" />
        <h1 className="text-sm sm:text-lg font-black italic tracking-widest text-cyber-green uppercase font-display">
          Claw Control
        </h1>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/50 border border-cyber-green/20 rounded-full">
        {connected ? (
          <>
            <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyber-green" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyber-green animate-pulse" />
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyber-red" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyber-red" />
          </>
        )}
        <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-cyber-green/80">
          {connected ? 'Online' : 'Offline'}
        </span>
      </div>
    </header>
  );
}

interface MobileNavProps {
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
  agentCount: number;
  messageCount: number;
}

/**
 * Bottom navigation bar for mobile devices.
 * Provides tab switching between Agents, Board, and Chat views.
 */
function MobileNav({ activeView, onViewChange, agentCount, messageCount }: MobileNavProps) {
  const tabs = [
    { id: 'agents' as MobileView, icon: Bot, label: 'Agents', count: agentCount },
    { id: 'board' as MobileView, icon: LayoutGrid, label: 'Board', count: null },
    { id: 'chat' as MobileView, icon: MessageSquare, label: 'Feed', count: messageCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/90 border-t border-cyber-green/30 backdrop-blur-sm z-40 flex items-center justify-around px-2 safe-area-pb">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-4 rounded-lg transition-all min-w-[70px] min-h-[44px] ${
              isActive 
                ? 'text-cyber-green bg-cyber-green/10' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.count !== null && tab.count > 0 && (
                <span className={`absolute -top-1.5 -right-2 text-[8px] font-mono px-1 rounded-full ${
                  isActive ? 'bg-cyber-green text-black' : 'bg-gray-600 text-white'
                }`}>
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Main application component.
 * Orchestrates data fetching, SSE subscriptions, and renders the dashboard layout.
 */
export default function App() {
  const [mobileView, setMobileView] = useState<MobileView>('board');
  const { agents, setAgents, loading: agentsLoading } = useAgents();
  const { kanban, loading: tasksLoading, moveTask, setTasks } = useTasks();
  const { messages, loading: messagesLoading, addMessage } = useMessages();
  
  // SSE event handlers for real-time updates
  const handleAgentUpdate = useCallback((agent: Agent, _action?: 'created' | 'updated') => {
    setAgents(prev => {
      const idx = prev.findIndex(a => a.id === agent.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...agent };
        return next;
      }
      return [...prev, agent];
    });
  }, [setAgents]);

  const handleTaskUpdate = useCallback((task: Task | { id: string }, action?: 'created' | 'updated' | 'deleted') => {
    if (action === 'deleted') {
      setTasks(prev => prev.filter(t => t.id !== task.id));
      return;
    }
    
    setTasks(prev => {
      const fullTask = task as Task;
      const idx = prev.findIndex(t => t.id === fullTask.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...fullTask };
        return next;
      }
      return [...prev, fullTask];
    });
  }, [setTasks]);

  const handleMessageUpdate = useCallback((message: Message) => {
    addMessage(message);
  }, [addMessage]);

  const handleInit = useCallback((data: { tasks: any[]; agents: any[] }) => {
    if (data.agents) setAgents(data.agents.map(transformAgent));
    if (data.tasks) setTasks(data.tasks.map(transformTask));
  }, [setAgents, setTasks]);

  const { connected } = useSSE(
    handleAgentUpdate,
    handleTaskUpdate,
    handleMessageUpdate,
    handleInit
  );

  const handleMoveTask = useCallback((taskId: string, newStatus: TaskStatus) => {
    moveTask(taskId, newStatus);
  }, [moveTask]);

  // Render dashboard
  return (
    <div className="h-screen flex flex-col bg-cyber-black text-white overflow-hidden crt-overlay">
      <Header connected={connected} />
      
      {/* Desktop Layout (md+) */}
      <main className="flex-1 hidden md:flex overflow-hidden">
        <aside className="w-56 lg:w-64 border-r border-cyber-green/20 bg-black/30 flex-shrink-0 overflow-hidden">
          <AgentsList agents={agents} loading={agentsLoading} />
        </aside>

        <section className="flex-1 overflow-hidden">
          <KanbanBoard 
            kanban={kanban} 
            agents={agents}
            loading={tasksLoading}
            onMoveTask={handleMoveTask}
          />
        </section>

        <aside className="w-72 lg:w-80 border-l border-cyber-blue/20 bg-black/30 flex-shrink-0 overflow-hidden">
          <AgentChat messages={messages} loading={messagesLoading} />
        </aside>
      </main>

      {/* Mobile Layout (below md) */}
      <main className="flex-1 md:hidden overflow-hidden pb-14">
        <div className={`h-full overflow-hidden ${mobileView === 'agents' ? 'block' : 'hidden'}`}>
          <AgentsList agents={agents} loading={agentsLoading} />
        </div>

        <div className={`h-full overflow-hidden ${mobileView === 'board' ? 'block' : 'hidden'}`}>
          <KanbanBoard 
            kanban={kanban} 
            agents={agents}
            loading={tasksLoading}
            onMoveTask={handleMoveTask}
          />
        </div>

        <div className={`h-full overflow-hidden ${mobileView === 'chat' ? 'block' : 'hidden'}`}>
          <AgentChat messages={messages} loading={messagesLoading} />
        </div>
      </main>

      <MobileNav 
        activeView={mobileView} 
        onViewChange={setMobileView}
        agentCount={agents.length}
        messageCount={messages.length}
      />
    </div>
  );
}
