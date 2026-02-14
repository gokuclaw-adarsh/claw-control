import ReactMarkdown from 'react-markdown';
import { X, Bot, Clock, Calendar, Tag, Activity } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import type { Task, TaskStatus, Agent } from '../types';

// Status configuration with labels and colors
const statusConfig: Record<TaskStatus, { 
  label: string; 
  color: string; 
  bgColor: string; 
  borderColor: string;
}> = {
  backlog: { 
    label: 'Backlog', 
    color: 'text-accent-tertiary', 
    bgColor: 'bg-accent-tertiary/10',
    borderColor: 'border-accent-tertiary/30'
  },
  todo: { 
    label: 'Todo', 
    color: 'text-accent-danger', 
    bgColor: 'bg-accent-danger/10',
    borderColor: 'border-accent-danger/30'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'text-cyber-orange', 
    bgColor: 'bg-cyber-orange/10',
    borderColor: 'border-cyber-orange/30'
  },
  review: { 
    label: 'Review', 
    color: 'text-accent-warning', 
    bgColor: 'bg-accent-warning/10',
    borderColor: 'border-accent-warning/30'
  },
  completed: { 
    label: 'Completed', 
    color: 'text-cyber-green', 
    bgColor: 'bg-cyber-green/10',
    borderColor: 'border-cyber-green/30'
  },
};

// Format date to readable string
function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get relative time
function getRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(dateString);
}

interface TaskDetailModalProps {
  task: Task | null;
  agents: Agent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, agents, open, onOpenChange }: TaskDetailModalProps) {
  if (!task) return null;

  const agent = agents.find(a => a.id === task.agentId);
  const statusStyle = statusConfig[task.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-hidden
        bg-gradient-to-br from-claw-surface via-claw-card to-claw-surface
        border border-white/10 rounded-2xl
        shadow-2xl shadow-black/50
        backdrop-blur-xl
        p-0
      ">
        {/* Glow effect at top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent" />
        
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Task ID */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-accent-muted bg-white/5 px-2 py-0.5 rounded">
                  #{task.id}
                </span>
                {/* Status Badge */}
                <span className={`
                  text-xs font-semibold px-2.5 py-1 rounded-lg
                  ${statusStyle.bgColor} ${statusStyle.color} ${statusStyle.borderColor}
                  border
                `}>
                  {statusStyle.label}
                </span>
              </div>
              
              {/* Title */}
              <DialogTitle className="text-xl font-bold text-white leading-tight">
                {task.title}
              </DialogTitle>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="
                p-2 rounded-lg
                text-accent-muted hover:text-white
                bg-white/5 hover:bg-white/10
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-accent-primary/50
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Description
            </h3>
            {task.description ? (
              <div className="
                prose prose-invert prose-sm max-w-none
                prose-p:text-text-secondary prose-p:leading-relaxed
                prose-headings:text-white prose-headings:font-semibold
                prose-a:text-accent-primary prose-a:no-underline hover:prose-a:underline
                prose-code:text-cyber-pink prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-claw-bg prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
                prose-ul:text-text-secondary prose-ol:text-text-secondary
                prose-li:marker:text-accent-muted
                bg-white/[0.02] rounded-xl p-4 border border-white/5
              ">
                <ReactMarkdown>{task.description}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-accent-muted text-sm italic bg-white/[0.02] rounded-xl p-4 border border-white/5">
                No description provided.
              </p>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assigned Agent */}
            <div className="
              bg-white/[0.02] rounded-xl p-4 border border-white/5
              space-y-2
            ">
              <h4 className="text-xs font-semibold text-accent-muted uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-3.5 h-3.5" />
                Assigned To
              </h4>
              {agent ? (
                <div className="flex items-center gap-3">
                  <div className="
                    w-10 h-10 rounded-xl 
                    bg-gradient-to-br from-accent-secondary/20 to-accent-tertiary/10 
                    border border-white/10 
                    flex items-center justify-center
                    overflow-hidden
                  ">
                    {agent.avatar ? (
                      <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-5 h-5 text-accent-secondary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{agent.name}</p>
                    <p className="text-xs text-accent-muted capitalize">{agent.status}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="
                    w-10 h-10 rounded-xl 
                    bg-accent-muted/10 
                    border border-white/5 
                    flex items-center justify-center
                  ">
                    <Bot className="w-5 h-5 text-accent-muted" />
                  </div>
                  <p className="text-sm text-accent-muted">Unassigned</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="
              bg-white/[0.02] rounded-xl p-4 border border-white/5
              space-y-2
            ">
              <h4 className="text-xs font-semibold text-accent-muted uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Status
              </h4>
              <div className="flex items-center gap-3">
                <div className={`
                  w-3 h-3 rounded-full ${statusStyle.bgColor}
                  ring-4 ${statusStyle.bgColor}
                `} />
                <span className={`text-sm font-medium ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>
            </div>

            {/* Created At */}
            <div className="
              bg-white/[0.02] rounded-xl p-4 border border-white/5
              space-y-2
            ">
              <h4 className="text-xs font-semibold text-accent-muted uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Created
              </h4>
              <div>
                <p className="text-sm font-medium text-white">{formatDate(task.createdAt)}</p>
                <p className="text-xs text-accent-muted">{getRelativeTime(task.createdAt)}</p>
              </div>
            </div>

            {/* Updated At */}
            <div className="
              bg-white/[0.02] rounded-xl p-4 border border-white/5
              space-y-2
            ">
              <h4 className="text-xs font-semibold text-accent-muted uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Last Updated
              </h4>
              <div>
                <p className="text-sm font-medium text-white">{formatDate(task.updatedAt)}</p>
                <p className="text-xs text-accent-muted">{getRelativeTime(task.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer gradient */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </DialogContent>
    </Dialog>
  );
}
