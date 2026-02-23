import { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Wifi, WifiOff, Bot, LayoutGrid, MessageSquare } from 'lucide-react';
import { AgentsList } from './components/AgentsList';
import { KanbanBoard } from './components/KanbanBoard';
import { AgentChat } from './components/AgentChat';
import { OperationsObservabilityPanel } from './components/OperationsObservabilityPanel';
import { useAgents, useTasks, useMessages, useSSE, useOpsObservability, transformAgent, transformTask } from './hooks/useApi';
import type { Agent, Task, Message, TaskStatus } from './types';

type MobileView = 'agents' | 'board' | 'chat';

function Header({ connected }: { connected: boolean }) {
  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 border-b border-white/5 bg-claw-surface/80 backdrop-blur-md flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 flex items-center justify-center">
            <span className="text-lg">🦞</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
              Claw Control
            </h1>
            <p className="text-[10px] text-accent-muted font-medium tracking-wide uppercase hidden sm:block">
              Agent Operations Center
            </p>
          </div>
        </Link>
      </div>
      
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
        connected 
          ? 'bg-accent-primary/10 border-accent-primary/30' 
          : 'bg-accent-danger/10 border-accent-danger/30'
      }`}>
        {connected ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-accent-primary" />
            <div className="w-2 h-2 rounded-full bg-accent-primary status-pulse" />
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-accent-danger" />
            <div className="w-2 h-2 rounded-full bg-accent-danger" />
          </>
        )}
        <span className={`text-xs font-medium ${connected ? 'text-accent-primary' : 'text-accent-danger'}`}>
          {connected ? 'Live' : 'Offline'}
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

function MobileNav({ activeView, onViewChange, agentCount, messageCount }: MobileNavProps) {
  const tabs = [
    { id: 'agents' as MobileView, icon: Bot, label: 'Agents', count: agentCount },
    { id: 'board' as MobileView, icon: LayoutGrid, label: 'Board', count: null },
    { id: 'chat' as MobileView, icon: MessageSquare, label: 'Feed', count: messageCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-claw-surface/95 border-t border-white/5 backdrop-blur-lg z-40 flex items-center justify-around px-4 safe-area-pb">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-5 rounded-xl transition-all min-w-[72px] min-h-[48px] ${
              isActive 
                ? 'text-accent-primary bg-accent-primary/10' 
                : 'text-accent-muted hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {tab.count !== null && tab.count > 0 && (
                <span className={`absolute -top-1 -right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center ${
                  isActive ? 'bg-accent-primary text-white' : 'bg-accent-muted/50 text-white'
                }`}>
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'text-accent-primary' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function Dashboard() {
  const [mobileView, setMobileView] = useState<MobileView>('board');
  const [feedCollapsed, setFeedCollapsed] = useState(false);
  const { agents, setAgents, loading: agentsLoading } = useAgents();
  const { kanban, loading: tasksLoading, moveTask, setTasks, loadMoreCompleted, completedLoadingMore, completedHasMore } = useTasks();
  const { messages, loading: messagesLoading, addMessage, loadMore: loadMoreMessages, loadingMore: messagesLoadingMore, hasMore: messagesHasMore } = useMessages();
  const { data: opsData, loading: opsLoading } = useOpsObservability();

  // SSE handlers
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

  return (
    <>
      <Header connected={connected} />
      
      {/* Desktop Layout (md+) */}
      <main className="flex-1 hidden md:flex overflow-hidden">
        {/* Left Panel - Agents List */}
        <aside className="w-64 lg:w-72 border-r border-white/5 bg-claw-surface/50 flex-shrink-0 overflow-hidden">
          <AgentsList agents={agents} loading={agentsLoading} />
        </aside>

        {/* Main Area - Operations + Kanban Board */}
        <section className="flex-1 overflow-hidden bg-claw-bg flex flex-col">
          <OperationsObservabilityPanel data={opsData} loading={opsLoading} />
          <div className="flex-1 overflow-hidden">
            <KanbanBoard 
              kanban={kanban} 
              agents={agents}
              loading={tasksLoading}
              onMoveTask={handleMoveTask}
              loadMoreCompleted={loadMoreCompleted}
              completedLoadingMore={completedLoadingMore}
              completedHasMore={completedHasMore}
            />
          </div>
        </section>

        {/* Right Panel - Agent Chat (Collapsible) */}
        <aside className={`border-l border-white/5 bg-claw-surface/50 flex-shrink-0 overflow-hidden transition-all duration-300 ${
          feedCollapsed ? 'w-12' : 'w-80 lg:w-96'
        }`}>
          <AgentChat 
            messages={messages} 
            loading={messagesLoading} 
            loadingMore={messagesLoadingMore}
            hasMore={messagesHasMore}
            loadMore={loadMoreMessages}
            collapsed={feedCollapsed}
            onToggleCollapse={() => setFeedCollapsed(!feedCollapsed)}
          />
        </aside>
      </main>

      {/* Mobile Layout (below md) */}
      <main className="flex-1 md:hidden overflow-hidden pb-16">
        <div className={`h-full overflow-hidden ${mobileView === 'agents' ? 'block' : 'hidden'}`}>
          <AgentsList agents={agents} loading={agentsLoading} />
        </div>

        <div className={`h-full overflow-hidden ${mobileView === 'board' ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col overflow-hidden">
            <OperationsObservabilityPanel data={opsData} loading={opsLoading} />
            <div className="flex-1 overflow-hidden">
              <KanbanBoard 
                kanban={kanban} 
                agents={agents}
                loading={tasksLoading}
                onMoveTask={handleMoveTask}
                loadMoreCompleted={loadMoreCompleted}
                completedLoadingMore={completedLoadingMore}
                completedHasMore={completedHasMore}
              />
            </div>
          </div>
        </div>

        <div className={`h-full overflow-hidden ${mobileView === 'chat' ? 'block' : 'hidden'}`}>
          <AgentChat 
            messages={messages} 
            loading={messagesLoading}
            loadingMore={messagesLoadingMore}
            hasMore={messagesHasMore}
            loadMore={loadMoreMessages}
          />
        </div>
      </main>

      <MobileNav 
        activeView={mobileView} 
        onViewChange={setMobileView}
        agentCount={agents.length}
        messageCount={messages.length}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-claw-bg text-white overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
