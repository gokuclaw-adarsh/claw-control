import { Activity, AlertTriangle, Bot, Clock3, Lock, RotateCcw } from 'lucide-react';
import type { OpsDecision, OpsEvent, OpsObservability } from '../types';

function ago(ts?: string | null) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(diff)) return '—';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function actionTone(action?: string) {
  switch (action) {
    case 'monitor': return 'text-sky-300';
    case 'observe': return 'text-indigo-300';
    case 'consider': return 'text-yellow-300';
    case 'skip': return 'text-slate-300';
    default: return 'text-gray-300';
  }
}

export function OperationsObservabilityPanel({ data, loading }: { data: OpsObservability | null; loading: boolean }) {
  const patrol = data?.heartbeatPatrol;
  const events: OpsEvent[] = data?.events?.slice(-8).reverse() || [];
  const decisions: OpsDecision[] = patrol?.decisions?.slice(-8).reverse() || [];

  return (
    <section className="border-b border-white/5 bg-claw-surface/60 backdrop-blur-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-accent-primary" />Operations Observability</h2>
        <span className="text-[11px] text-accent-muted">{loading ? 'Refreshing…' : `Updated ${ago(data?.lastUpdated || data?.lastEventAt)}`}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 p-2 bg-white/5"><div className="text-accent-muted">Lock state</div><div className="font-semibold mt-1 flex items-center gap-1"><Lock className="w-3 h-3" />{data?.lockState || 'unknown'}</div></div>
        <div className="rounded-lg border border-white/10 p-2 bg-white/5"><div className="text-accent-muted">Retry count</div><div className="font-semibold mt-1 flex items-center gap-1"><RotateCcw className="w-3 h-3" />{data?.retryCount ?? 0}</div></div>
        <div className="rounded-lg border border-white/10 p-2 bg-white/5"><div className="text-accent-muted">Spawn status</div><div className="font-semibold mt-1 flex items-center gap-1"><Bot className="w-3 h-3" />{data?.spawnStatus || 'unknown'}</div></div>
        <div className="rounded-lg border border-white/10 p-2 bg-white/5"><div className="text-accent-muted">Last patrol run</div><div className="font-semibold mt-1 flex items-center gap-1"><Clock3 className="w-3 h-3" />{ago(patrol?.lastRunAt)}</div></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 p-2"><div className="text-accent-muted">Tasks scanned</div><div className="font-semibold">{patrol?.tasksScannedCount ?? 0}</div></div>
        <div className="rounded-lg border border-white/10 p-2"><div className="text-accent-muted">Backlog pending</div><div className="font-semibold">{patrol?.backlogPendingCount ?? 0}</div></div>
        <div className="rounded-lg border border-white/10 p-2"><div className="text-accent-muted">TODO auto-picked</div><div className="font-semibold">{patrol?.todoAutoPickedCount ?? 0}</div></div>
        <div className="rounded-lg border border-white/10 p-2 col-span-2 lg:col-span-2"><div className="text-accent-muted">Stale task alerts</div><div className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-400" />{patrol?.staleTaskAlerts ?? 0}</div></div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 p-2">
          <div className="text-xs text-accent-muted mb-2">Per-action decisions (why acted / not acted)</div>
          <div className="space-y-1 max-h-36 overflow-auto pr-1">
            {decisions.length === 0 && <div className="text-xs text-gray-400">No patrol decisions yet.</div>}
            {decisions.map((d, i) => (
              <div key={`${d.taskId}-${i}`} className="text-xs rounded-md bg-white/5 px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate mr-2">#{d.taskId} {d.taskTitle || 'Task'}</span>
                  <span className={`uppercase text-[10px] ${actionTone(d.action)}`}>{d.action || 'n/a'}</span>
                </div>
                <div className="text-accent-muted truncate">{d.reason || 'No reason provided.'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 p-2">
          <div className="text-xs text-accent-muted mb-2">Orchestrator event stream</div>
          <div className="space-y-1 max-h-36 overflow-auto pr-1">
            {events.length === 0 && <div className="text-xs text-gray-400">No events observed yet.</div>}
            {events.map((e, i) => (
              <div key={`${e.event}-${e.timestamp}-${i}`} className="text-xs rounded-md bg-white/5 px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate mr-2">{e.event}</span>
                  <span className="text-[10px] text-accent-muted">{ago(e.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
