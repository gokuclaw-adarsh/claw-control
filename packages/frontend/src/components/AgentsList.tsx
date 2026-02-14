import { Bot, Circle } from 'lucide-react';
import type { Agent, AgentStatus } from '../types';
import { AgentAvatar } from './AgentAvatar';

interface AgentsListProps {
  agents: Agent[];
  loading?: boolean;
}

const statusConfig: Record<AgentStatus, { color: string; bgColor: string; label: string; pulse: boolean }> = {
  working: { 
    color: 'text-accent-primary', 
    bgColor: 'bg-accent-primary', 
    label: 'Working', 
    pulse: true 
  },
  idle: { 
    color: 'text-accent-warning', 
    bgColor: 'bg-accent-warning', 
    label: 'Idle', 
    pulse: false 
  },
  offline: { 
    color: 'text-accent-muted', 
    bgColor: 'bg-accent-muted', 
    label: 'Offline', 
    pulse: false 
  },
};

function StatusIndicator({ status }: { status: AgentStatus }) {
  const config = statusConfig[status] || statusConfig.offline;
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <Circle 
          className={`w-2 h-2 ${config.color}`}
          fill="currentColor"
          strokeWidth={0}
        />
        {config.pulse && (
          <span className={`absolute inset-0 w-2 h-2 ${config.bgColor} rounded-full animate-ping opacity-50`} />
        )}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className={`
      p-4 rounded-xl border border-white/5 
      bg-gradient-to-br from-claw-card to-claw-surface 
      hover:border-white/10 hover:shadow-card-hover
      active:scale-[0.98] transition-all duration-200 
      group touch-manipulation animate-in
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          w-12 h-12 rounded-xl 
          bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10 
          border border-white/10
          flex items-center justify-center flex-shrink-0 
          group-hover:border-accent-primary/30 group-hover:shadow-glow-sm
          transition-all duration-200 overflow-hidden
        `}>
          <AgentAvatar name={agent.name} size={48} enableBlink={agent.status === 'working'} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate group-hover:text-accent-primary transition-colors">
            {agent.name}
          </h3>
          {agent.description && (
            <p className="text-xs text-accent-muted mt-1 line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          )}
          <div className="mt-2.5">
            <StatusIndicator status={agent.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-claw-card animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/5 rounded w-24" />
          <div className="h-3 bg-white/5 rounded w-32" />
          <div className="h-3 bg-white/5 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function AgentsList({ agents, loading }: AgentsListProps) {
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Agents</h2>
              <p className="text-[10px] text-accent-muted">Team members</p>
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {[1, 2, 3].map(i => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/5 bg-claw-surface/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Agents</h2>
              <p className="text-[10px] text-accent-muted">Team members</p>
            </div>
          </div>
          <span className="text-xs font-mono text-accent-primary bg-accent-primary/10 px-2 py-1 rounded-md">
            {agents.length}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-accent-muted/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-accent-muted" />
            </div>
            <p className="text-sm text-accent-muted">No agents connected</p>
            <p className="text-xs text-accent-muted/60 mt-1">Agents will appear here when online</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
