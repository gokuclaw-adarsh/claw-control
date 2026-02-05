import { useEffect, useRef } from 'react';
import { MessageSquare, Bot, PanelRightClose } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';

interface AgentChatProps {
  messages: Message[];
  loading?: boolean;
  onCollapse?: () => void;
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch {
    return timestamp;
  }
}

const typeColors: Record<string, { text: string; bg: string; border: string }> = {
  info: { 
    text: 'text-accent-secondary', 
    bg: 'bg-accent-secondary/5', 
    border: 'border-accent-secondary/20' 
  },
  success: { 
    text: 'text-accent-primary', 
    bg: 'bg-accent-primary/5', 
    border: 'border-accent-primary/20' 
  },
  warning: { 
    text: 'text-accent-warning', 
    bg: 'bg-accent-warning/5', 
    border: 'border-accent-warning/20' 
  },
  error: { 
    text: 'text-accent-danger', 
    bg: 'bg-accent-danger/5', 
    border: 'border-accent-danger/20' 
  },
};

function ChatMessage({ message }: { message: Message }) {
  const typeStyle = typeColors[message.type || 'info'] || typeColors.info;
  
  return (
    <div className={`
      px-4 py-3 
      hover:bg-white/[0.02] 
      transition-colors 
      border-b border-white/5 last:border-0 
      touch-manipulation 
      animate-in
    `}>
      {/* Header: Agent + Time */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded-lg ${typeStyle.bg} border ${typeStyle.border} flex items-center justify-center flex-shrink-0`}>
          <Bot className={`w-3.5 h-3.5 ${typeStyle.text}`} />
        </div>
        <span className={`text-xs font-semibold ${typeStyle.text} truncate`}>
          {message.agentName}
        </span>
        <span className="text-[10px] text-accent-muted font-mono ml-auto flex-shrink-0">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
      
      {/* Message Content - Markdown Rendered */}
      <div className="text-sm text-gray-300 pl-[38px] break-words leading-relaxed prose prose-invert prose-sm max-w-none
        prose-p:my-1 prose-p:leading-relaxed
        prose-strong:text-white prose-strong:font-semibold
        prose-em:text-gray-400
        prose-code:text-accent-secondary prose-code:bg-accent-secondary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-claw-surface prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-2
        prose-a:text-accent-secondary prose-a:no-underline hover:prose-a:underline
        prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5
        prose-headings:text-white prose-headings:font-semibold prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
      ">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-white/5 animate-pulse">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-white/5" />
        <div className="h-3 w-20 bg-white/5 rounded" />
        <div className="h-3 w-12 bg-white/5 rounded ml-auto" />
      </div>
      <div className="pl-[38px] space-y-1.5">
        <div className="h-3 w-full bg-white/5 rounded" />
        <div className="h-3 w-2/3 bg-white/5 rounded" />
      </div>
    </div>
  );
}

export function AgentChat({ messages, loading, onCollapse }: AgentChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-secondary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-accent-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Agent Feed</h2>
              <p className="text-[10px] text-accent-muted">Live updates</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <MessageSkeleton key={i} />
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
            <div className="w-8 h-8 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-accent-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Agent Feed</h2>
              <p className="text-[10px] text-accent-muted">Live updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-accent-secondary bg-accent-secondary/10 px-2 py-1 rounded-md">
              {messages.length}
            </span>
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
                title="Collapse Agent Feed"
              >
                <PanelRightClose className="w-4 h-4 text-accent-muted hover:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-accent-muted/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-accent-muted" />
              </div>
              <p className="text-sm text-accent-muted">No messages yet</p>
              <p className="text-xs text-accent-muted/60 mt-1">Agent updates will appear here</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={scrollRef} />
          </>
        )}
      </div>
    </div>
  );
}
