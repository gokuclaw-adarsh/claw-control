/**
 * @fileoverview Agent Profile Modal component.
 *
 * Displays a detailed profile view when clicking an agent card, including
 * bio, communication style, BMAD source, and "dos/donts" lists.
 *
 * @module components/AgentProfileModal
 */

import { useEffect, useState } from 'react';
import { X, BookOpen, MessageCircle, Shield, Zap, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Agent } from '../types';
import { fetchAgentById } from '../hooks/useApi';
import { AgentAvatar } from './AgentAvatar';

interface AgentProfileModalProps {
  /** The agent to display (basic info from list) */
  agent: Agent;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Safely parses a JSON string array, returning an empty array on failure.
 */
function parseJsonArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If it's not JSON, treat as single-item
    return value ? [value] : [];
  }
}

/**
 * Renders a list section with an icon and title.
 */
function ProfileSection({
  icon,
  title,
  items,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyText?: string;
}) {
  if (items.length === 0 && !emptyText) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-muted">
        {icon}
        <span>{title}</span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5 ml-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-white/80 flex items-start gap-2">
              <span className="text-accent-primary mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-accent-muted/60 italic">{emptyText}</p>
      )}
    </div>
  );
}

export function AgentProfileModal({ agent, onClose }: AgentProfileModalProps) {
  const [fullAgent, setFullAgent] = useState<Agent>(agent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAgentById(agent.id).then((fetched) => {
      if (!cancelled && fetched) setFullAgent(fetched);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [agent.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const principles = parseJsonArray(fullAgent.principles);
  const criticalActions = parseJsonArray(fullAgent.critical_actions);
  const dosList = parseJsonArray(fullAgent.dos);
  const dontsList = parseJsonArray(fullAgent.donts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-claw-card to-claw-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start gap-4 p-6 pb-4 border-b border-white/5 bg-claw-card/90 backdrop-blur-sm rounded-t-2xl">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <AgentAvatar name={fullAgent.name} size={64} enableBlink={fullAgent.status === 'working'} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{fullAgent.name}</h2>
            {fullAgent.role && (
              <p className="text-xs font-medium text-accent-primary">{fullAgent.role}</p>
            )}
            {fullAgent.description && (
              <p className="text-xs text-accent-muted mt-1 line-clamp-2">{fullAgent.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-accent-muted hover:text-white transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Bio */}
              {fullAgent.bio && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-muted">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Bio</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{fullAgent.bio}</p>
                </div>
              )}

              {/* Communication Style */}
              {fullAgent.communication_style && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-muted">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Communication Style</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{fullAgent.communication_style}</p>
                </div>
              )}

              {/* What I Do / Don't Do */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileSection
                  icon={<ThumbsUp className="w-3.5 h-3.5 text-green-400" />}
                  title="What I Do"
                  items={dosList}
                />
                <ProfileSection
                  icon={<ThumbsDown className="w-3.5 h-3.5 text-red-400" />}
                  title="What I Don't Do"
                  items={dontsList}
                />
              </div>

              {/* Principles */}
              <ProfileSection
                icon={<Shield className="w-3.5 h-3.5" />}
                title="Principles"
                items={principles}
              />

              {/* Critical Actions */}
              <ProfileSection
                icon={<Zap className="w-3.5 h-3.5" />}
                title="Critical Actions"
                items={criticalActions}
              />

              {/* BMAD Source */}
              {fullAgent.bmad_source && (
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-accent-muted">
                    BMAD Source: <span className="text-white/60">{fullAgent.bmad_source}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
