import { useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Inbox, ListTodo, Eye, CheckCircle2, GripVertical, Clock, Bot, Play } from 'lucide-react';
import type { Task, KanbanData, TaskStatus, Agent } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

// Helper to format relative time
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Status color config for card accents
const statusColors: Record<TaskStatus, { 
  border: string; 
  accent: string; 
  bg: string;
  glow: string;
}> = {
  backlog: { 
    border: 'border-l-accent-tertiary', 
    accent: 'text-accent-tertiary', 
    bg: 'bg-accent-tertiary',
    glow: 'hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]'
  },
  todo: { 
    border: 'border-l-accent-danger', 
    accent: 'text-accent-danger', 
    bg: 'bg-accent-danger',
    glow: 'hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
  },
  in_progress: { 
    border: 'border-l-cyber-orange', 
    accent: 'text-cyber-orange', 
    bg: 'bg-cyber-orange',
    glow: 'hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]'
  },
  review: { 
    border: 'border-l-accent-warning', 
    accent: 'text-accent-warning', 
    bg: 'bg-accent-warning',
    glow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]'
  },
  completed: { 
    border: 'border-l-cyber-green', 
    accent: 'text-cyber-green', 
    bg: 'bg-cyber-green',
    glow: 'hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]'
  },
};

interface KanbanBoardProps {
  kanban: KanbanData;
  agents: Agent[];
  loading?: boolean;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

const columnConfig: Record<TaskStatus, { title: string; icon: typeof Inbox; color: string }> = {
  backlog: { title: 'Backlog', icon: Inbox, color: 'accent-tertiary' },
  todo: { title: 'Todo', icon: ListTodo, color: 'accent-danger' },
  in_progress: { title: 'In Progress', icon: Play, color: 'cyber-orange' },
  review: { title: 'Review', icon: Eye, color: 'accent-warning' },
  completed: { title: 'Completed', icon: CheckCircle2, color: 'cyber-green' },
};

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  isDragging?: boolean;
  onClick?: () => void;
}

function TaskCard({ task, agents, isDragging, onClick }: TaskCardProps) {
  const agent = agents.find(a => a.id === task.agentId);
  const statusStyle = statusColors[task.status];
  const relativeTime = getRelativeTime(task.updatedAt || task.createdAt);
  
  return (
    <div 
      onClick={onClick}
      className={`
        group relative p-3.5 rounded-xl border border-white/5 
        bg-gradient-to-br from-claw-card to-claw-surface
        transition-all duration-200
        border-l-[3px] ${statusStyle.border} touch-manipulation
        ${isDragging 
          ? 'shadow-lg shadow-accent-primary/20 scale-[1.02] border-accent-primary/30' 
          : `hover:border-white/10 ${statusStyle.glow} active:scale-[0.98] cursor-pointer`
        }
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-3 right-3 opacity-40 sm:opacity-0 sm:group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-4 h-4 text-accent-muted cursor-grab active:cursor-grabbing" />
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-semibold text-white pr-6 leading-snug line-clamp-2">
        {task.title}
      </h4>
      
      {/* Description */}
      {task.description && (
        <p className="text-xs text-accent-muted mt-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}
      
      {/* Footer: Agent + Timestamp */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 gap-2">
        {/* Agent Badge */}
        {agent ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-secondary/20 to-accent-tertiary/10 border border-white/10 flex items-center justify-center flex-shrink-0">
              {agent.avatar ? (
                <img src={agent.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-accent-secondary" />
              )}
            </div>
            <span className="text-[11px] font-medium text-accent-secondary truncate max-w-[80px]">
              {agent.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-accent-muted/10 border border-white/5 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-accent-muted" />
            </div>
            <span className="text-[11px] text-accent-muted">Unassigned</span>
          </div>
        )}
        
        {/* Timestamp */}
        {relativeTime && (
          <div className="flex items-center gap-1.5 text-accent-muted flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-mono">{relativeTime}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SortableTaskProps {
  task: Task;
  agents: Agent[];
  onTaskClick?: (task: Task) => void;
}

function SortableTask({ task, agents, onTaskClick }: SortableTaskProps) {
  const hasDragged = useRef(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Track if we're dragging to prevent click on drop
  const handlePointerDown = () => {
    hasDragged.current = false;
  };
  
  const handlePointerMove = () => {
    hasDragged.current = true;
  };

  const handleClick = () => {
    // Only trigger click if we didn't drag
    if (!hasDragged.current && onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      <TaskCard task={task} agents={agents} onClick={handleClick} />
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  agents: Agent[];
  onTaskClick?: (task: Task) => void;
}

function KanbanColumn({ status, tasks, agents, onTaskClick }: KanbanColumnProps) {
  const config = columnConfig[status];
  const Icon = config.icon;
  
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: 'column' },
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col h-full bg-claw-surface/30 border border-white/5 rounded-2xl overflow-hidden w-[280px] sm:w-[300px] min-w-[280px] sm:min-w-[300px] max-w-[90vw] sm:max-w-[300px] snap-center flex-shrink-0 backdrop-blur-sm"
    >
      <div className={`p-3 border-b border-white/5 bg-claw-surface/50`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg bg-${config.color}/10 flex items-center justify-center`}>
            <Icon className={`w-4 h-4 text-${config.color}`} />
          </div>
          <h3 className={`text-sm font-semibold text-${config.color}`}>
            {config.title}
          </h3>
          <span className={`ml-auto text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-${config.color}/10 text-${config.color}`}>
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} agents={agents} onTaskClick={onTaskClick} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center text-accent-muted/50 text-xs py-8">
            <div className="text-center">
              <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No tasks</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="flex flex-col h-full bg-claw-surface/30 border border-white/5 rounded-2xl overflow-hidden min-w-[280px] sm:min-w-[300px] snap-center flex-shrink-0">
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-claw-card rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ kanban, agents, loading, onMoveTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'completed'];
  const allTasks = [...kanban.backlog, ...kanban.todo, ...kanban.in_progress, ...kanban.review, ...kanban.completed];

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    let newStatus: TaskStatus | null = null;
    
    if (columns.includes(over.id as TaskStatus)) {
      newStatus = over.id as TaskStatus;
    } else {
      const overTask = allTasks.find(t => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus && newStatus !== task.status) {
      onMoveTask(taskId, newStatus);
    }
  };

  if (loading) {
    return (
      <div className="h-full p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4 h-full overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin">
          {[1, 2, 3, 4, 5].map(i => (
            <ColumnSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-3 sm:p-4 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 sm:gap-4 h-full overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-thin">
          {columns.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={[...kanban[status]].sort((a, b) => 
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              )}
              agents={agents}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} agents={agents} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        agents={agents}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
