import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquare, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';
import { AgentAvatar } from './AgentAvatar';

interface AgentChatProps {
  messages: Message[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timestamp;
  }
}

// Agent color palette - cyberpunk/DBZ theme
const agentColors: Record<string, { bg: string; border: string; accent: string; avatar: string }> = {
  '1': { // Goku - Orange/Blue
    bg: 'bg-gradient-to-br from-orange-500/10 to-blue-500/10',
    border: 'border-orange-500/30',
    accent: 'text-orange-400',
    avatar: 'bg-gradient-to-br from-orange-500 to-orange-600',
  },
  '2': { // Vegeta - Blue/Purple
    bg: 'bg-gradient-to-br from-blue-600/10 to-purple-500/10',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    avatar: 'bg-gradient-to-br from-blue-600 to-blue-700',
  },
  '3': { // Piccolo - Green
    bg: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
    border: 'border-green-500/30',
    accent: 'text-green-400',
    avatar: 'bg-gradient-to-br from-green-500 to-green-600',
  },
  '4': { // Gohan - Yellow/Purple
    bg: 'bg-gradient-to-br from-yellow-500/10 to-purple-500/10',
    border: 'border-yellow-500/30',
    accent: 'text-yellow-400',
    avatar: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
  },
  '5': { // Bulma - Cyan/Pink
    bg: 'bg-gradient-to-br from-cyan-500/10 to-pink-500/10',
    border: 'border-cyan-500/30',
    accent: 'text-cyan-400',
    avatar: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
  },
  '6': { // Trunks - Purple/Blue
    bg: 'bg-gradient-to-br from-purple-500/10 to-blue-500/10',
    border: 'border-purple-500/30',
    accent: 'text-purple-400',
    avatar: 'bg-gradient-to-br from-purple-500 to-purple-600',
  },
  '7': { // Rob - Slate/Gray
    bg: 'bg-gradient-to-br from-slate-500/10 to-gray-500/10',
    border: 'border-slate-500/30',
    accent: 'text-slate-400',
    avatar: 'bg-gradient-to-br from-slate-500 to-slate-600',
  },
  '8': { // Android 18 - Pink/Red
    bg: 'bg-gradient-to-br from-pink-500/10 to-red-500/10',
    border: 'border-pink-500/30',
    accent: 'text-pink-400',
    avatar: 'bg-gradient-to-br from-pink-500 to-pink-600',
  },
};

const defaultColor = {
  bg: 'bg-gradient-to-br from-accent-secondary/10 to-accent-primary/10',
  border: 'border-accent-secondary/30',
  accent: 'text-accent-secondary',
  avatar: 'bg-gradient-to-br from-accent-secondary to-accent-primary',
};

function getAgentColor(agentId: string) {
  return agentColors[agentId] || defaultColor;
}

function ChatBubble({ message }: { message: Message }) {
  const colors = getAgentColor(message.agentId);
  
  return (
    <div className="flex gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-xl flex-shrink-0
        ${colors.avatar}
        flex items-center justify-center
        shadow-lg shadow-black/20
        ring-2 ring-white/10
        overflow-hidden
      `}>
        <AgentAvatar name={message.agentName} size={40} />
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Name + Timestamp */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className={`font-semibold text-sm ${colors.accent}`}>
            {message.agentName}
          </span>
          <span className="text-[10px] text-accent-muted/70 font-mono">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        
        {/* Chat Bubble */}
        <div className={`
          relative
          ${colors.bg}
          ${colors.border}
          border
          rounded-2xl rounded-tl-md
          px-4 py-2.5
          backdrop-blur-sm
          shadow-lg shadow-black/10
        `}>
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 rounded-2xl rounded-tl-md bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          {/* Message text */}
          <div className="relative text-sm text-gray-200 break-words leading-relaxed prose prose-invert prose-sm max-w-none
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
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-2">
          <div className="h-4 w-20 bg-white/5 rounded" />
          <div className="h-3 w-16 bg-white/5 rounded" />
        </div>
        <div className="bg-white/5 rounded-2xl rounded-tl-md px-4 py-3 space-y-2">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-2/3 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

export function AgentChat({ messages, loading, loadingMore, hasMore, loadMore, collapsed, onToggleCollapse }: AgentChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const prevScrollHeightRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);

  // Detect scroll position and trigger lazy loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
    
    // Load more when scrolled near top (< 100px from top)
    if (scrollTop < 100 && hasMore && loadMore && !loadingMore && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      prevScrollHeightRef.current = scrollHeight;
      loadMore();
    }
  }, [hasMore, loadMore, loadingMore]);

  // Preserve scroll position after loading more messages
  useEffect(() => {
    if (!loadingMore && isLoadingMoreRef.current && containerRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      if (scrollDiff > 0) {
        containerRef.current.scrollTop += scrollDiff;
      }
      isLoadingMoreRef.current = false;
    }
  }, [loadingMore, messages.length]);

  // Scroll to bottom
  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    if (!showScrollButton && !isLoadingMoreRef.current) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Collapsed view - thin bar with icon
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 bg-claw-surface/30 backdrop-blur-sm">
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center hover:bg-accent-secondary/20 transition-all duration-200 group hover:scale-105"
          title="Expand Agent Feed"
        >
          <ChevronLeft className="w-4 h-4 text-accent-secondary group-hover:text-white transition-colors" />
        </button>
        <div className="mt-4 w-10 h-10 rounded-xl bg-gradient-to-br from-accent-secondary/20 to-accent-primary/20 border border-accent-secondary/30 flex items-center justify-center relative shadow-lg">
          <MessageSquare className="w-4 h-4 text-accent-secondary" />
          {messages.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center bg-gradient-to-r from-accent-secondary to-accent-primary text-white shadow-lg">
              {messages.length > 99 ? '99+' : messages.length}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-claw-surface/50 to-transparent">
        <div className="p-4 border-b border-white/5 bg-claw-surface/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-secondary/20 to-accent-primary/20 border border-accent-secondary/30 flex items-center justify-center shadow-lg">
              <MessageSquare className="w-4 h-4 text-accent-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Agent Chat</h2>
              <p className="text-[10px] text-accent-muted">Loading messages...</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <MessageSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-claw-surface/30 to-transparent">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-claw-surface/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleCollapse}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-secondary/20 to-accent-primary/20 border border-accent-secondary/30 flex items-center justify-center hover:from-accent-secondary/30 hover:to-accent-primary/30 transition-all duration-200 group shadow-lg hover:scale-105"
              title="Collapse Agent Feed"
            >
              <ChevronRight className="w-4 h-4 text-accent-secondary group-hover:text-white transition-colors" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Agent Chat
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </h2>
              <p className="text-[10px] text-accent-muted">Live conversation</p>
            </div>
          </div>
          <span className="text-xs font-mono text-white/80 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            {messages.length} {messages.length === 1 ? 'msg' : 'msgs'}
          </span>
        </div>
      </div>
      
      {/* Messages Container */}
      <div ref={containerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-secondary/20 to-accent-primary/20 border border-accent-secondary/30 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <MessageSquare className="w-7 h-7 text-accent-secondary" />
              </div>
              <p className="text-sm text-white/80 font-medium">No messages yet</p>
              <p className="text-xs text-accent-muted/60 mt-1.5 max-w-[200px] mx-auto">
                When agents start working, their updates will appear here as a conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {/* Loading more indicator at top */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-accent-secondary animate-spin" />
                <span className="ml-2 text-xs text-accent-muted">Loading older messages...</span>
              </div>
            )}
            {/* Show "no more" indicator when at the beginning */}
            {!hasMore && messages.length > 0 && (
              <div className="flex items-center justify-center py-3">
                <span className="text-[10px] text-accent-muted/60 font-mono">— Beginning of conversation —</span>
              </div>
            )}
            {messages.map(message => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <div ref={scrollRef} className="h-4" />
          </div>
        )}
        
        {/* Floating scroll-to-bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-accent-secondary flex items-center justify-center shadow-lg hover:bg-accent-secondary/80 transition-all duration-200 hover:scale-105 z-10"
            title="Jump to latest"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
