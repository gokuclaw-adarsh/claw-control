import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Bot, Clock, Calendar, Tag, Activity, MessageSquare, Send, User, Paperclip, FileText, Package, Users, Plus, Trash2, ShieldCheck, ShieldAlert, CheckSquare, Square, ListChecks } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import type { Task, TaskStatus, Agent, Comment, TaskAssignee, Subtask } from '../types';
import { fetchTaskComments, createTaskComment, updateTaskContext, updateTaskDeliverable, fetchTaskAssignees, addTaskAssignee, removeTaskAssignee, approveTask, updateTaskApproval, fetchSubtasks, createSubtask, updateSubtask, deleteSubtask } from '../hooks/useApi';
import { AgentAvatar } from './AgentAvatar';

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [context, setContext] = useState(task?.context || '');
  const [savingContext, setSavingContext] = useState(false);
  const [deliverableType, setDeliverableType] = useState(task?.deliverableType || '');
  const [deliverableContent, setDeliverableContent] = useState(task?.deliverableContent || '');
  const [savingDeliverable, setSavingDeliverable] = useState(false);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [showAddAssignee, setShowAddAssignee] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(task?.requires_approval || false);
  const [approvedAt, setApprovedAt] = useState(task?.approved_at);
  const [approvedBy, setApprovedBy] = useState(task?.approved_by);
  const [approvingTask, setApprovingTask] = useState(false);

  // Sync context and deliverable when task changes
  useEffect(() => {
    if (task) {
      setContext(task.context || '');
      setDeliverableType(task.deliverableType || '');
      setDeliverableContent(task.deliverableContent || '');
      setRequiresApproval(task.requires_approval || false);
      setApprovedAt(task.approved_at);
      setApprovedBy(task.approved_by);
    }
  }, [task]);

  // Fetch comments when task changes and modal is open
  useEffect(() => {
    if (task && open) {
      setLoadingComments(true);
      fetchTaskComments(task.id)
        .then(setComments)
        .finally(() => setLoadingComments(false));
      setLoadingAssignees(true);
      fetchTaskAssignees(task.id)
        .then(setAssignees)
        .finally(() => setLoadingAssignees(false));
      setLoadingSubtasks(true);
      fetchSubtasks(task.id)
        .then(setSubtasks)
        .finally(() => setLoadingSubtasks(false));
    }
  }, [task, open]);

  const handleSubmitComment = async () => {
    if (!task || !newComment.trim() || submitting) return;
    
    setSubmitting(true);
    const comment = await createTaskComment(task.id, newComment.trim());
    if (comment) {
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleSaveContext = async () => {
    if (!task || savingContext) return;
    setSavingContext(true);
    await updateTaskContext(task.id, context);
    setSavingContext(false);
  };

  const handleSaveDeliverable = async () => {
    if (!task || savingDeliverable || !deliverableType) return;
    setSavingDeliverable(true);
    await updateTaskDeliverable(task.id, deliverableType, deliverableContent);
    setSavingDeliverable(false);
  };

  const handleAddAssignee = async (agentId: number) => {
    if (!task) return;
    const assignee = await addTaskAssignee(task.id, agentId);
    if (assignee) {
      // Refresh full list to get agent details
      const updated = await fetchTaskAssignees(task.id);
      setAssignees(updated);
    }
    setShowAddAssignee(false);
  };

  const handleRemoveAssignee = async (agentId: string) => {
    if (!task) return;
    const ok = await removeTaskAssignee(task.id, agentId);
    if (ok) {
      setAssignees(prev => prev.filter(a => a.agent_id !== agentId));
    }
  };

  const handleToggleApproval = async () => {
    if (!task) return;
    const newValue = !requiresApproval;
    setRequiresApproval(newValue);
    // If turning off approval, clear approval state
    if (!newValue) {
      setApprovedAt(undefined);
      setApprovedBy(undefined);
    }
    await updateTaskApproval(task.id, newValue);
  };

  const handleApprove = async () => {
    if (!task || approvingTask) return;
    setApprovingTask(true);
    const approverName = prompt('Enter your name to approve this task:');
    if (approverName) {
      const updated = await approveTask(task.id, approverName);
      if (updated) {
        setApprovedAt(updated.approved_at);
        setApprovedBy(updated.approved_by);
      }
    }
    setApprovingTask(false);
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim() || addingSubtask) return;
    setAddingSubtask(true);
    const subtask = await createSubtask(task.id, newSubtaskTitle.trim());
    if (subtask) {
      setSubtasks(prev => [...prev, subtask]);
      setNewSubtaskTitle('');
    }
    setAddingSubtask(false);
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    if (!task) return;
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, status: newStatus } : s));
    await updateSubtask(task.id, subtask.id, { status: newStatus });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    await deleteSubtask(task.id, subtaskId);
  };

  const subtasksDone = subtasks.filter(s => s.status === 'done').length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0;

  if (!task) return null;

  const attachments = task.attachments || [];
  const assignedAgentIds = new Set(assignees.map(a => a.agent_id));
  const availableAgents = agents.filter(a => !assignedAgentIds.has(a.id));

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

          {/* Context / Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Context / Notes
            </h3>
            <div className="relative">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                onBlur={handleSaveContext}
                placeholder="Add context, notes, or additional details for this task..."
                className="
                  w-full bg-white/[0.02] border border-white/10 rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder:text-accent-muted
                  focus:outline-none focus:ring-2 focus:ring-accent-primary/50
                  focus:border-accent-primary/50
                  resize-y
                  min-h-[100px]
                "
                disabled={savingContext}
              />
              {savingContext && (
                <div className="absolute top-3 right-3">
                  <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {context !== (task.context || '') && !savingContext && (
                <p className="text-xs text-accent-muted mt-1">Changes save on blur</p>
              )}
            </div>
          </div>

          {/* Deliverable */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <Package className="w-4 h-4" />
              Deliverable
              {deliverableType && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
                  {deliverableType}
                </span>
              )}
            </h3>
            <div className="space-y-3">
              <select
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value)}
                className="
                  w-full bg-white/[0.02] border border-white/10 rounded-xl
                  px-4 py-2.5 text-sm text-white
                  focus:outline-none focus:ring-2 focus:ring-accent-primary/50
                  focus:border-accent-primary/50
                  appearance-none cursor-pointer
                "
              >
                <option value="" className="bg-claw-surface">Select type...</option>
                <option value="document" className="bg-claw-surface">📄 Document</option>
                <option value="spec" className="bg-claw-surface">📋 Spec</option>
                <option value="code" className="bg-claw-surface">💻 Code</option>
                <option value="review" className="bg-claw-surface">🔍 Review</option>
                <option value="design" className="bg-claw-surface">🎨 Design</option>
                <option value="other" className="bg-claw-surface">📦 Other</option>
              </select>
              <div className="relative">
                <textarea
                  value={deliverableContent}
                  onChange={(e) => setDeliverableContent(e.target.value)}
                  onBlur={handleSaveDeliverable}
                  placeholder="Add deliverable content (URL, description, or paste content)..."
                  className="
                    w-full bg-white/[0.02] border border-white/10 rounded-xl
                    px-4 py-3 text-sm text-white
                    placeholder:text-accent-muted
                    focus:outline-none focus:ring-2 focus:ring-accent-primary/50
                    focus:border-accent-primary/50
                    resize-y
                    min-h-[80px]
                  "
                  disabled={savingDeliverable}
                />
                {savingDeliverable && (
                  <div className="absolute top-3 right-3">
                    <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {deliverableType && deliverableContent && (
                <button
                  onClick={handleSaveDeliverable}
                  disabled={savingDeliverable}
                  className="
                    px-4 py-2 text-xs font-medium rounded-lg
                    bg-cyber-green/10 text-cyber-green border border-cyber-green/30
                    hover:bg-cyber-green/20 transition-all duration-200
                    disabled:opacity-50
                  "
                >
                  {savingDeliverable ? 'Saving...' : 'Save Deliverable'}
                </button>
              )}
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
                <span className="text-xs font-normal text-accent-muted">
                  ({attachments.length})
                </span>
              </h3>
              <div className="space-y-2">
                {attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      flex items-center gap-3 px-4 py-3
                      bg-white/[0.02] rounded-xl border border-white/5
                      text-sm text-accent-primary hover:text-white
                      hover:bg-white/[0.04] transition-all duration-200
                      truncate
                    "
                  >
                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Approval Gate */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Approval Gate
            </h3>
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 space-y-3">
              {/* Toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-text-secondary">Requires human approval</span>
                <button
                  onClick={handleToggleApproval}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors duration-200
                    ${requiresApproval ? 'bg-accent-primary' : 'bg-white/10'}
                  `}
                >
                  <span className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
                    ${requiresApproval ? 'translate-x-5' : 'translate-x-0'}
                  `} />
                </button>
              </label>

              {/* Approval Status */}
              {requiresApproval && (
                <div className="pt-2 border-t border-white/5">
                  {approvedAt ? (
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="w-4 h-4 text-cyber-green" />
                      <span className="text-cyber-green font-medium">Approved</span>
                      <span className="text-accent-muted">by {approvedBy}</span>
                      <span className="text-accent-muted text-xs">({formatDate(approvedAt)})</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-medium">Awaiting Approval</span>
                      </div>
                      <button
                        onClick={handleApprove}
                        disabled={approvingTask}
                        className="
                          px-3 py-1.5 rounded-lg text-xs font-semibold
                          bg-cyber-green/20 text-cyber-green border border-cyber-green/30
                          hover:bg-cyber-green/30 transition-all duration-200
                          disabled:opacity-50
                        "
                      >
                        {approvingTask ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Subtasks
              {subtasks.length > 0 && (
                <span className="text-xs font-normal text-accent-muted">
                  ({subtasksDone}/{subtasks.length})
                </span>
              )}
            </h3>

            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-green to-accent-primary rounded-full transition-all duration-300"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
                <p className="text-xs text-accent-muted text-right">{subtaskProgress}%</p>
              </div>
            )}

            {loadingSubtasks ? (
              <div className="text-center py-4">
                <div className="inline-block w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 bg-white/[0.02] rounded-xl px-4 py-2.5 border border-white/5 group"
                  >
                    <button
                      onClick={() => handleToggleSubtask(subtask)}
                      className="flex-shrink-0 text-accent-muted hover:text-cyber-green transition-colors"
                    >
                      {subtask.status === 'done' ? (
                        <CheckSquare className="w-5 h-5 text-cyber-green" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${subtask.status === 'done' ? 'text-accent-muted line-through' : 'text-white'}`}>
                      {subtask.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-1 rounded-lg text-accent-muted hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add subtask input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                    placeholder="Add a subtask..."
                    className="
                      flex-1 bg-white/[0.02] border border-dashed border-white/10 rounded-xl
                      px-4 py-2.5 text-sm text-white
                      placeholder:text-accent-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-primary/50
                      focus:border-accent-primary/50
                    "
                    disabled={addingSubtask}
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim() || addingSubtask}
                    className="
                      p-2.5 rounded-xl
                      bg-accent-primary/20 text-accent-primary
                      hover:bg-accent-primary/30
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
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

          {/* Assignees Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assignees
              <span className="text-xs font-normal text-accent-muted">
                ({assignees.length})
              </span>
            </h3>
            
            {loadingAssignees ? (
              <div className="text-center py-4">
                <div className="inline-block w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center justify-between bg-white/[0.02] rounded-xl px-4 py-3 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-secondary/20 to-accent-tertiary/10 border border-white/10 flex items-center justify-center overflow-hidden">
                        {assignee.agent_avatar ? (
                          <img src={assignee.agent_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <AgentAvatar name={assignee.agent_name || 'Agent'} size={32} enableBlink={false} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{assignee.agent_name || `Agent #${assignee.agent_id}`}</p>
                        <p className="text-xs text-accent-muted capitalize">{assignee.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignee(assignee.agent_id)}
                      className="p-1.5 rounded-lg text-accent-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add assignee */}
                {showAddAssignee ? (
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 space-y-2">
                    <p className="text-xs text-accent-muted">Select an agent:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availableAgents.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => handleAddAssignee(Number(a.id))}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0">
                            {a.avatar ? (
                              <img src={a.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <AgentAvatar name={a.name} size={24} enableBlink={false} />
                            )}
                          </div>
                          <span className="text-sm text-white">{a.name}</span>
                          <span className="text-xs text-accent-muted ml-auto">{a.role}</span>
                        </button>
                      ))}
                      {availableAgents.length === 0 && (
                        <p className="text-xs text-accent-muted text-center py-2">All agents assigned</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAddAssignee(false)}
                      className="text-xs text-accent-muted hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddAssignee(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/10 text-accent-muted hover:text-white hover:border-white/20 transition-all w-full"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add assignee</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-accent-secondary flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments
              <span className="text-xs font-normal text-accent-muted">
                ({comments.length})
              </span>
            </h3>
            
            {/* Comment Input */}
            <div className="flex gap-3">
              <div className="
                w-10 h-10 rounded-xl 
                bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 
                border border-white/10 
                flex items-center justify-center
                flex-shrink-0
              ">
                <User className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment..."
                  className="
                    w-full bg-white/[0.02] border border-white/10 rounded-xl
                    px-4 py-3 pr-12 text-sm text-white
                    placeholder:text-accent-muted
                    focus:outline-none focus:ring-2 focus:ring-accent-primary/50
                    focus:border-accent-primary/50
                    resize-none
                    min-h-[80px]
                  "
                  disabled={submitting}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="
                    absolute bottom-3 right-3 p-2 rounded-lg
                    bg-accent-primary/20 text-accent-primary
                    hover:bg-accent-primary/30 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {loadingComments ? (
                <div className="text-center py-4">
                  <div className="inline-block w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-accent-muted text-sm text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="
                      bg-white/[0.02] rounded-xl p-4 border border-white/5
                      space-y-2
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div className="
                        w-8 h-8 rounded-lg 
                        bg-gradient-to-br from-accent-secondary/20 to-accent-tertiary/10 
                        border border-white/10 
                        flex items-center justify-center
                        flex-shrink-0
                      ">
                        <Bot className="w-4 h-4 text-accent-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {comment.agent_name || 'Unknown Agent'}
                        </p>
                        <p className="text-xs text-accent-muted">
                          {getRelativeTime(comment.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary pl-11">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer gradient */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </DialogContent>
    </Dialog>
  );
}
