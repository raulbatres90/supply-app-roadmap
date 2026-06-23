/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * Roadmap surface — stats / filters / table+gantt views with phase drill-down / side panel
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Trash2, Save, MessageSquare, X,
  GanttChartSquare, Table as TableIcon, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Crosshair } from 'lucide-react';
import { Button, Input, Select, Textarea, Card, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import * as api from '@/lib/api';

// ─── Status / Priority tokens ───────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pendiente',  dot: 'var(--color-ink-3)',    bg: 'var(--color-paper-3)',     fg: 'var(--color-ink-2)' },
  { value: 'in_progress', label: 'En curso',   dot: 'var(--color-blue)',     bg: 'var(--color-blue-soft)',   fg: 'var(--color-blue)' },
  { value: 'blocked',     label: 'Bloqueada',  dot: 'var(--color-rose)',     bg: 'var(--color-rose-soft)',   fg: 'var(--color-rose)' },
  { value: 'done',        label: 'Hecha',      dot: 'var(--color-emerald)',  bg: 'var(--color-emerald-soft)',fg: 'var(--color-emerald)' },
  { value: 'cancelled',   label: 'Cancelada',  dot: 'var(--color-ink-4)',    bg: 'var(--color-paper-3)',     fg: 'var(--color-ink-4)' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Baja',     fg: 'var(--color-ink-3)' },
  { value: 'medium',   label: 'Media',    fg: 'var(--color-ink-2)' },
  { value: 'high',     label: 'Alta',     fg: 'var(--color-amber)' },
  { value: 'critical', label: 'Crítica',  fg: 'var(--color-rose)' },
];

// ─── Phase color families ───────────────────────────────────────────────────
// Cada fase tiene una "familia" cromática que se aplica al phase header (barra accent
// + tint sutil de fondo). Esto da personalidad visual al roadmap sin saturar las rows.
const PHASE_COLOR = {
  'Pre-launch': { accent: 'var(--color-accent)',   tint: 'var(--color-accent-tint)' },
  'Billing':    { accent: 'var(--color-emerald)',  tint: 'var(--color-emerald-tint)' },
  'Onboarding': { accent: 'var(--color-teal)',     tint: 'var(--color-teal-tint)' },
  'Infra':      { accent: 'var(--color-blue)',     tint: 'var(--color-blue-tint)' },
  'Beta':       { accent: 'var(--color-violet)',   tint: 'var(--color-violet-tint)' },
  'CRM':        { accent: 'var(--color-pink)',     tint: 'var(--color-pink-tint)' },
  'Marketing':  { accent: 'var(--color-pink)',     tint: 'var(--color-pink-tint)' },
  'Launch':     { accent: 'var(--color-amber)',    tint: 'var(--color-amber-tint)' },
  'Soporte':    { accent: 'var(--color-teal)',     tint: 'var(--color-teal-tint)' },
  'Analytics':  { accent: 'var(--color-violet)',   tint: 'var(--color-violet-tint)' },
  'Producto':   { accent: 'var(--color-accent)',   tint: 'var(--color-accent-tint)' },
};
function phaseColor(phase) {
  return PHASE_COLOR[phase] || { accent: 'var(--color-ink-3)', tint: 'var(--color-paper-3)' };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function groupByPhase(tasks) {
  const map = new Map();
  for (const t of tasks) {
    const key = t.phase || '(Sin fase)';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return Array.from(map.entries()).map(([phase, tasks]) => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const hours = tasks.reduce((s, t) => s + (parseFloat(t.estimated_hours) || 0), 0);
    const dated = tasks.filter(t => t.start_date && t.end_date);
    const minStart = dated.length ? new Date(Math.min(...dated.map(t => new Date(t.start_date)))) : null;
    const maxEnd = dated.length ? new Date(Math.max(...dated.map(t => new Date(t.end_date)))) : null;
    return {
      phase, tasks,
      stats: { total, done, blocked, inProgress, pct: total ? Math.round(done / total * 100) : 0, hours, minStart, maxEnd },
    };
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('table');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [collapsedPhases, setCollapsedPhases] = useState(() => {
    try {
      const raw = localStorage.getItem('dfa:roadmap:collapsed-phases');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const togglePhase = (phase) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase); else next.add(phase);
      try { localStorage.setItem('dfa:roadmap:collapsed-phases', JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const expandAll = () => {
    setCollapsedPhases(new Set());
    try { localStorage.removeItem('dfa:roadmap:collapsed-phases'); } catch {}
  };
  const collapseAll = (phaseNames) => {
    setCollapsedPhases(new Set(phaseNames));
    try { localStorage.setItem('dfa:roadmap:collapsed-phases', JSON.stringify(phaseNames)); } catch {}
  };

  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['internal-tasks'], queryFn: api.listTasks });
  const { data: members = [] } = useQuery({ queryKey: ['internal-members'], queryFn: api.listMembers });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });

  const updateMutation = useMutation({
    mutationFn: ({ id, fields }) => api.updateTask(id, fields),
    onSuccess: invalidate,
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al actualizar'),
  });
  const createMutation = useMutation({
    mutationFn: api.createTask,
    onSuccess: (t) => { invalidate(); setSelectedTaskId(t.id); toast.success('Tarea creada'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al crear'),
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => { invalidate(); setSelectedTaskId(null); toast.success('Tarea eliminada'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al eliminar'),
  });

  const phases = useMemo(() => [...new Set(tasks.map(t => t.phase).filter(Boolean))], [tasks]);
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (filterPhase !== 'all' && t.phase !== filterPhase) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned') { if (t.assignee_id) return false; }
        else if (t.assignee_id !== filterAssignee) return false;
      }
      if (q && !(t.title || '').toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, search, filterPhase, filterStatus, filterAssignee]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const totalHours = tasks.reduce((s, t) => s + (parseFloat(t.estimated_hours) || 0), 0);
    return { total, done, inProgress, blocked, totalHours, pct: total ? Math.round(done / total * 100) : 0 };
  }, [tasks]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div>
      {/* ─── Stats band — cards con accent strip por métrica ─── */}
      <section className="px-6 pt-5 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Total"      value={stats.total}      icon="◇" tone="ink" />
          <MetricCard label="Hechas"     value={stats.done}       icon="✓" tone="emerald" />
          <MetricCard label="En curso"   value={stats.inProgress} icon="→" tone="blue" />
          <MetricCard label="Bloqueadas" value={stats.blocked}    icon="!" tone="rose" />
          <MetricCard label="Horas est." value={stats.totalHours.toFixed(0)} suffix="h" icon="◷" tone="amber" />
          <ProgressCard label="Progreso" value={stats.pct} />
        </div>
      </section>

      {/* ─── Toolbar ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-3 sticky top-[57px] z-10 bg-gradient-to-b from-[var(--color-canvas)] via-[var(--color-canvas)] to-transparent">
        <div className="bg-[var(--color-paper)]/85 backdrop-blur-md border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-sm)] px-3 py-2.5 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-4)] pointer-events-none" />
            <Input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarea…"
              className="h-8 text-[12px] pl-8"
            />
          </div>

          {/* Filters */}
          <Select value={filterPhase} onChange={setFilterPhase} className="h-8 text-[12px] w-[140px]">
            <option value="all">Todas las fases</option>
            {phases.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={filterStatus} onChange={setFilterStatus} className="h-8 text-[12px] w-[140px]">
            <option value="all">Cualquier status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select value={filterAssignee} onChange={setFilterAssignee} className="h-8 text-[12px] w-[160px]">
            <option value="all">Cualquier persona</option>
            <option value="unassigned">Sin asignar</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </Select>

          {/* Spacer + count */}
          <div className="flex-1 hidden lg:block" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
            <span className="text-[var(--color-ink)] tabular">{filteredTasks.length}</span>
            <span className="text-[var(--color-ink-4)]"> / {tasks.length}</span>
          </div>

          {/* Expand/collapse */}
          <div className="hidden md:flex items-center gap-px border border-[var(--color-border)] rounded-md overflow-hidden">
            <button onClick={expandAll} className="px-2 h-8 text-[11px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] transition-colors">Expandir</button>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <button onClick={() => collapseAll(phases.length > 0 ? phases : [])} className="px-2 h-8 text-[11px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] transition-colors">Colapsar</button>
          </div>

          {/* View switch */}
          <div className="flex items-center gap-px border border-[var(--color-border)] rounded-md overflow-hidden">
            <button onClick={() => setView('table')} className={cn('px-2.5 h-8 text-[11px] font-medium flex items-center gap-1 transition-colors', view === 'table' ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]')}>
              <TableIcon className="w-3 h-3" /> Tabla
            </button>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <button onClick={() => setView('gantt')} className={cn('px-2.5 h-8 text-[11px] font-medium flex items-center gap-1 transition-colors', view === 'gantt' ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]')}>
              <GanttChartSquare className="w-3 h-3" /> Gantt
            </button>
          </div>

          <Button variant="accent" size="sm" onClick={() => createMutation.mutate({ title: 'Nueva tarea', phase: filterPhase !== 'all' ? filterPhase : null, position: tasks.length })}>
            <Plus className="w-3.5 h-3.5" /> Nueva
          </Button>
        </div>
      </section>

      {/* ─── Content area ───────────────────────────────────────────── */}
      <div className="px-6 py-6 flex gap-6 items-start">
        <div className={cn('flex-1 min-w-0', selectedTaskId && 'max-w-[calc(100%-432px)]')}>
          {isLoading ? (
            <div className="py-24 text-center font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Cargando…</div>
          ) : view === 'table' ? (
            <TableView tasks={filteredTasks} selectedId={selectedTaskId} onSelect={setSelectedTaskId} collapsedPhases={collapsedPhases} togglePhase={togglePhase} />
          ) : (
            <GanttView tasks={filteredTasks} selectedId={selectedTaskId} onSelect={setSelectedTaskId} collapsedPhases={collapsedPhases} togglePhase={togglePhase} />
          )}
        </div>

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            members={members}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={(fields) => updateMutation.mutate({ id: selectedTask.id, fields })}
            onDelete={() => { if (confirm('¿Eliminar esta tarea? Subtareas y comentarios también se borran.')) deleteMutation.mutate(selectedTask.id); }}
            isSaving={updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// ─── Stats components — cards con accent strip y color por tone ──────────────
const TONE_MAP = {
  ink:     { fg: 'var(--color-ink)',     dot: 'var(--color-ink-3)',  strip: 'var(--color-ink-3)',  tint: 'var(--color-paper-3)' },
  emerald: { fg: 'var(--color-emerald)', dot: 'var(--color-emerald)', strip: 'var(--color-emerald)', tint: 'var(--color-emerald-tint)' },
  blue:    { fg: 'var(--color-blue)',    dot: 'var(--color-blue)',    strip: 'var(--color-blue)',    tint: 'var(--color-blue-tint)' },
  rose:    { fg: 'var(--color-rose)',    dot: 'var(--color-rose)',    strip: 'var(--color-rose)',    tint: 'var(--color-rose-tint)' },
  amber:   { fg: 'var(--color-amber)',   dot: 'var(--color-amber)',   strip: 'var(--color-amber)',   tint: 'var(--color-amber-tint)' },
  accent:  { fg: 'var(--color-accent)',  dot: 'var(--color-accent)',  strip: 'var(--color-accent)',  tint: 'var(--color-accent-tint)' },
};

function MetricCard({ label, value, suffix, icon, tone = 'ink' }) {
  const t = TONE_MAP[tone] || TONE_MAP.ink;
  return (
    <div
      className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-[var(--shadow-card)] overflow-hidden p-4 transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-card-hover)]"
    >
      {/* Accent strip on top */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${t.strip}, transparent 80%)` }} />
      {/* Soft tint corner */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-60 blur-2xl" style={{ background: t.tint }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">{label}</p>
          <span className="font-mono text-[11px] leading-none" style={{ color: t.dot }}>{icon}</span>
        </div>
        <p className="font-display text-[28px] leading-none tracking-tighter tabular" style={{ color: t.fg }}>
          {value}
          {suffix && <span className="text-[14px] text-[var(--color-ink-3)] ml-1 tracking-normal">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

function ProgressCard({ label, value }) {
  return (
    <div className="relative rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-accent-tint)] to-[var(--color-paper)] shadow-[var(--shadow-card)] overflow-hidden p-4 transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-card-hover)]">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-violet)] to-[var(--color-accent)]" />
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-50 blur-2xl bg-[var(--color-accent-soft)]" />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent-text)]">{label}</p>
          <span className="font-mono text-[11px] leading-none text-[var(--color-accent)]">◐</span>
        </div>
        <p className="font-display text-[28px] leading-none tracking-tighter tabular text-[var(--color-accent)]">
          {value}<span className="text-[14px] text-[var(--color-accent-text)] tracking-normal">%</span>
        </p>
        <div className="mt-2.5 h-[5px] bg-[var(--color-paper-3)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-violet)] transition-all duration-[var(--dur-base)] ease-[var(--ease-out)]"
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Table view ─────────────────────────────────────────────────────────────
function TableView({ tasks, selectedId, onSelect, collapsedPhases, togglePhase }) {
  const groups = useMemo(() => groupByPhase(tasks), [tasks]);
  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
      <div className="max-h-[calc(100vh-340px)] overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--color-paper-2)] sticky top-0 z-10 border-b border-[var(--color-border)]">
            <tr>
              <Th className="w-[42%]">Tarea</Th>
              <Th className="w-28">Status</Th>
              <Th className="w-20">Prioridad</Th>
              <Th className="w-32">Asignada</Th>
              <Th className="w-24">Inicio</Th>
              <Th className="w-24">Fin</Th>
              <Th className="w-16 text-right">Horas</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ phase, tasks: groupTasks, stats }) => {
              const isCollapsed = collapsedPhases.has(phase);
              return (
                <React.Fragment key={phase}>
                  <PhaseHeaderRow
                    phase={phase} stats={stats}
                    isCollapsed={isCollapsed} onToggle={() => togglePhase(phase)}
                    columns={7}
                  />
                  {!isCollapsed && groupTasks.map(t => (
                    <TaskRow key={t.id} task={t} isSelected={t.id === selectedId} onSelect={() => onSelect(t.id)} />
                  ))}
                </React.Fragment>
              );
            })}
            {groups.length === 0 && (
              <tr><td colSpan={7} className="text-center py-16 font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Sin tareas que coincidan</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }) {
  return (
    <th className={cn('text-left px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium text-[var(--color-ink-3)]', className)}>
      {children}
    </th>
  );
}

function PhaseHeaderRow({ phase, stats, isCollapsed, onToggle, columns }) {
  const pc = phaseColor(phase);
  return (
    <tr onClick={onToggle} className="cursor-pointer border-t border-[var(--color-border)] select-none group relative">
      <td colSpan={columns} className="p-0">
        <div
          className="relative px-3 py-2.5 transition-colors duration-[var(--dur-fast)] group-hover:brightness-[0.98]"
          style={{ background: `linear-gradient(90deg, ${pc.tint} 0%, transparent 50%)` }}
        >
          {/* Vertical accent bar on left */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: pc.accent }} />
          <div className="flex items-center gap-3 pl-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[var(--color-ink-3)] group-hover:text-[var(--color-ink)] transition-colors">
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
              <span className="font-display text-[14px] font-semibold tracking-tighter text-[var(--color-ink)]">{phase}</span>
              <span className="font-mono text-[9px] uppercase tracking-widest font-medium px-1.5 py-px rounded-sm" style={{ color: pc.accent, background: pc.tint }}>
                {stats.total} {stats.total === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              {stats.done > 0       && <StatPill icon="✓"  count={stats.done}       color="var(--color-emerald)" />}
              {stats.inProgress > 0 && <StatPill icon="→"  count={stats.inProgress} color="var(--color-blue)" />}
              {stats.blocked > 0    && <StatPill icon="!"  count={stats.blocked}    color="var(--color-rose)" />}
              {stats.hours > 0      && <span className="font-mono text-[10px] text-[var(--color-ink-3)] tabular">{stats.hours.toFixed(0)}h</span>}
              <div className="w-20 h-[4px] bg-[var(--color-paper-3)] rounded-full overflow-hidden shadow-[inset_0_1px_1px_oklch(0%_0_0_/_0.05)]">
                <div className="h-full rounded-full transition-all duration-[var(--dur-base)]" style={{ width: `${stats.pct}%`, background: pc.accent }} />
              </div>
              <span className="font-mono text-[11px] font-semibold tabular w-9 text-right" style={{ color: pc.accent }}>{stats.pct}%</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function StatPill({ icon, count, color }) {
  return (
    <span className="font-mono text-[10px] flex items-center gap-1" style={{ color }}>
      <span className="text-[9px]">{icon}</span>
      <span className="tabular">{count}</span>
    </span>
  );
}

function TaskRow({ task, isSelected, onSelect }) {
  const status = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0];
  const priority = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1];
  return (
    <tr
      onClick={onSelect}
      className={cn(
        'border-t border-[var(--color-border-2)] cursor-pointer transition-colors duration-[var(--dur-fast)]',
        isSelected
          ? 'bg-[var(--color-accent-soft)]'
          : 'hover:bg-[var(--color-paper-2)]',
      )}
    >
      {/* Tarea */}
      <td className="px-3 py-2.5 pl-8">
        <div className={cn(
          'flex items-start gap-2',
          isSelected && 'border-l-2 border-[var(--color-accent)] pl-2 -ml-2',
        )}>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[13px] text-[var(--color-ink)] leading-snug">{task.title}</div>
            {(task.subtask_count > 0 || task.comment_count > 0 || task.depends_on?.length > 0 || task.tags?.length > 0) && (
              <div className="flex items-center gap-2.5 mt-1 text-[10px] font-mono text-[var(--color-ink-4)]">
                {task.subtask_count > 0 && <span>{task.subtask_count} sub</span>}
                {task.comment_count > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5" />{task.comment_count}
                  </span>
                )}
                {task.depends_on?.length > 0 && <span>↶ {task.depends_on.length} deps</span>}
                {task.tags?.length > 0 && task.tags.map(tag => (
                  <span key={tag} className="px-1 py-px rounded bg-[var(--color-paper-3)] text-[var(--color-ink-3)] normal-case">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Status — refined pill with subtle border */}
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] uppercase tracking-wider border"
          style={{
            background: status.bg,
            color: status.fg,
            borderColor: status.dot,
            borderWidth: '0.5px',
            boxShadow: `inset 0 1px 0 oklch(100% 0 0 / 0.4)`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot, boxShadow: `0 0 0 2px ${status.bg}` }} />
          {status.label}
        </span>
      </td>

      {/* Prioridad */}
      <td className="px-3 py-2.5">
        <span className="text-[12px] font-medium" style={{ color: priority.fg }}>{priority.label}</span>
      </td>

      {/* Asignada */}
      <td className="px-3 py-2.5">
        {task.assignee_name ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={task.assignee_name} color={task.assignee_color} size={5} />
            <span className="text-[12px] text-[var(--color-ink-2)] truncate max-w-[88px]">{task.assignee_name.split(' ')[0]}</span>
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-4)]">—</span>
        )}
      </td>

      {/* Inicio / Fin */}
      <td className="px-3 py-2.5"><DateCell value={task.start_date} /></td>
      <td className="px-3 py-2.5"><DateCell value={task.end_date} /></td>

      {/* Horas */}
      <td className="px-3 py-2.5 text-right">
        {task.estimated_hours
          ? <span className="font-mono text-[11px] tabular text-[var(--color-ink-2)]">{task.estimated_hours}h</span>
          : <span className="font-mono text-[10px] text-[var(--color-ink-4)]">—</span>}
      </td>
    </tr>
  );
}

// NOTA: nombrado DateCell, no Date, para no shadowear el constructor global Date.
// Con `function Date(...)` declarado a nivel módulo, cualquier `new Date(...)` dentro
// del mismo archivo invoca el componente como constructor y rompe el render.
function DateCell({ value }) {
  if (!value) return <span className="font-mono text-[10px] text-[var(--color-ink-4)]">—</span>;
  // Backend devuelve ISO timestamp ("2026-06-22T06:00:00.000Z") — slice los primeros 10 chars
  // para quedarnos solo con YYYY-MM-DD antes del split.
  const [y, m, d] = String(value).slice(0, 10).split('-');
  if (!y || !m || !d) return <span className="font-mono text-[10px] text-[var(--color-ink-4)]">—</span>;
  return (
    <span className="font-mono text-[11px] tabular text-[var(--color-ink-2)]">
      {d}<span className="text-[var(--color-ink-4)]">.{m}</span><span className="text-[var(--color-ink-4)]">.{y.slice(2)}</span>
    </span>
  );
}

function Avatar({ name, color, size = 5 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sizeMap = {
    5: 'w-5 h-5 text-[9px]',
    6: 'w-6 h-6 text-[10px]',
    7: 'w-7 h-7 text-[11px]',
    8: 'w-8 h-8 text-[12px]',
  };
  return (
    <span
      className={cn('rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-semibold flex-shrink-0', sizeMap[size] || sizeMap[5])}
      style={{ background: color || 'var(--color-accent)' }}
    >
      {initials}
    </span>
  );
}

// ─── Gantt view (modern · two-tier header · today column · refined bars) ────
function GanttView({ tasks, selectedId, onSelect, collapsedPhases, togglePhase }) {
  const scrollRef = React.useRef(null);
  const [hoveredTask, setHoveredTask] = React.useState(null);

  // Scroll-to-today via window event (triggered by the "Hoy" button in sub-toolbar)
  React.useEffect(() => {
    const handler = () => {
      if (!scrollRef.current) return;
      const todayBtn = scrollRef.current.querySelector('[data-today-marker]');
      if (todayBtn) todayBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };
    window.addEventListener('gantt:goto-today', handler);
    return () => window.removeEventListener('gantt:goto-today', handler);
  }, []);

  return <GanttInner
    tasks={tasks} selectedId={selectedId} onSelect={onSelect}
    collapsedPhases={collapsedPhases} togglePhase={togglePhase}
    scrollRef={scrollRef}
    hoveredTask={hoveredTask} setHoveredTask={setHoveredTask}
  />;
}

function GanttInner({ tasks, selectedId, onSelect, collapsedPhases, togglePhase, scrollRef, hoveredTask, setHoveredTask }) {
  const scheduled = tasks.filter(t => t.start_date && t.end_date);
  const unscheduled = tasks.filter(t => !t.start_date || !t.end_date);
  const scheduledGroups = useMemo(() => groupByPhase(scheduled), [scheduled]);
  const unscheduledGroups = useMemo(() => groupByPhase(unscheduled), [unscheduled]);

  // Empty state — cuando no hay NINGUNA tarea con fechas asignadas, el Gantt no tiene
  // mucho que mostrar más allá del Sin Programar. Renderizamos un hero state elegante
  // que invita al usuario a asignar fechas para activar el timeline.
  if (scheduled.length === 0 && tasks.length > 0) {
    return <GanttEmptyState totalTasks={tasks.length} unscheduledGroups={unscheduledGroups} selectedId={selectedId} onSelect={onSelect} collapsedPhases={collapsedPhases} togglePhase={togglePhase} />;
  }

  const dateRange = useMemo(() => {
    if (scheduled.length === 0) {
      const today = new window.Date();
      const end = new window.Date(today); end.setMonth(end.getMonth() + 3);
      return { start: today, end, days: 90 };
    }
    let min = new window.Date(scheduled[0].start_date);
    let max = new window.Date(scheduled[0].end_date);
    for (const t of scheduled) {
      const s = new window.Date(t.start_date), e = new window.Date(t.end_date);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);
    const days = Math.ceil((max - min) / 86400000);
    return { start: min, end: max, days };
  }, [scheduled]);

  const DAY_W = 28;             // wider day cells — números legibles, sensación más espaciada
  const ROW_H = 40;             // altura task row
  const PHASE_H = 44;           // altura phase header
  const LABEL_W = 320;
  const HEADER_TIER1_H = 28;    // strip mes
  const HEADER_TIER2_H = 26;    // strip día
  const totalWidth = dateRange.days * DAY_W;

  // Day cells precomputed — un solo loop, evita 3 loops separados (weekends + monthHeaders + days)
  const dayCells = useMemo(() => {
    const cells = [];
    const start = new window.Date(dateRange.start);
    for (let i = 0; i < dateRange.days; i++) {
      const d = new window.Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      cells.push({
        idx: i,
        date: d,
        dow: d.getDay(),
        day: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isMonthStart: d.getDate() === 1,
        isWeekStart: d.getDay() === 1, // lunes
      });
    }
    return cells;
  }, [dateRange]);

  // Month spans — agrupado desde dayCells, cada uno con left/width
  const monthSpans = useMemo(() => {
    const out = [];
    let current = null;
    dayCells.forEach((c) => {
      if (!current || c.year !== current.year || c.month !== current.month) {
        if (current) out.push(current);
        current = {
          label: c.date.toLocaleDateString('es-MX', { month: 'long' }),
          year: c.year,
          month: c.month,
          startIdx: c.idx,
          endIdx: c.idx,
        };
      } else {
        current.endIdx = c.idx;
      }
    });
    if (current) out.push(current);
    return out.map(m => ({
      ...m,
      left: m.startIdx * DAY_W,
      width: (m.endIdx - m.startIdx + 1) * DAY_W,
    }));
  }, [dayCells]);

  // Today index
  const todayIdx = useMemo(() => {
    const now = new window.Date();
    if (now < dateRange.start || now > dateRange.end) return null;
    return Math.floor((now - dateRange.start) / 86400000);
  }, [dateRange]);
  const todayLeft = todayIdx != null ? todayIdx * DAY_W : null;
  const todayDate = new window.Date();

  // Date range label (Jun 26 — Sep 26)
  const dateRangeLabel = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
    return `${fmt(dateRange.start)} — ${fmt(dateRange.end)}`;
  }, [dateRange]);

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
      {/* ─── Sub-toolbar: date range + go to today ─── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-paper-2)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Período</span>
          <span className="font-display text-[13px] font-semibold tracking-tighter text-[var(--color-ink)] tabular">{dateRangeLabel}</span>
          <span className="font-mono text-[10px] text-[var(--color-ink-4)]">·</span>
          <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{dateRange.days} días</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-3 pr-3 border-r border-[var(--color-border)]">
            {STATUS_OPTIONS.slice(0, 4).map(s => (
              <span key={s.value} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: s.dot }} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">{s.label}</span>
              </span>
            ))}
          </div>
          {todayIdx != null && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('gantt:goto-today'))}
              className="flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-[var(--color-accent-text)] hover:bg-[var(--color-accent-soft)] rounded-md transition-colors"
              title="Ir a hoy en el timeline"
            >
              <Crosshair className="w-3 h-3" /> Hoy
            </button>
          )}
        </div>
      </div>

      {/* ─── Timeline scroll container ─── */}
      <div ref={scrollRef} className="max-h-[calc(100vh-320px)] overflow-auto relative">
        <div style={{ minWidth: Math.max(totalWidth + LABEL_W, 800) }}>

          {/* ── Background layer (weekend + today + week separators + month divisores) ── */}
          {/* Renderizado UNA VEZ como fondo absolute, todos las rows se posicionan encima. */}
          {/* Esto evita renderizar weekends en cada row (perf + visual consistency) */}
          <BackgroundLayer
            dayCells={dayCells} monthSpans={monthSpans}
            todayLeft={todayLeft} totalWidth={totalWidth}
            DAY_W={DAY_W} LABEL_W={LABEL_W}
          />

          {/* ── Two-tier sticky header ── */}
          <div className="sticky top-0 z-30 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
            {/* Tier 1: Month strip */}
            <div className="flex">
              <div className="flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-paper)]" style={{ width: LABEL_W, height: HEADER_TIER1_H }} />
              <div className="relative bg-[var(--color-paper)]" style={{ width: totalWidth, height: HEADER_TIER1_H }}>
                {monthSpans.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-end pl-2 pb-1 border-r border-[var(--color-border)]"
                    style={{ left: m.left, width: m.width }}
                  >
                    <span className="font-display text-[11px] font-semibold tracking-tighter text-[var(--color-ink)] capitalize">
                      {m.label}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-4)] ml-1.5 pb-px">
                      '{String(m.year).slice(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 2: Day strip */}
            <div className="flex border-t border-[var(--color-border-2)]">
              <div className="flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-paper)] flex items-center px-3" style={{ width: LABEL_W, height: HEADER_TIER2_H }}>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-3)]">Tarea</span>
              </div>
              <div className="relative bg-[var(--color-paper)]" style={{ width: totalWidth, height: HEADER_TIER2_H }}>
                {dayCells.map((c) => (
                  <div
                    key={c.idx}
                    className={cn(
                      'absolute top-0 h-full flex flex-col items-center justify-center',
                      c.isWeekStart && 'border-l border-[var(--color-border-2)]',
                    )}
                    style={{ left: c.idx * DAY_W, width: DAY_W }}
                  >
                    <span className={cn(
                      'font-mono text-[10px] tabular leading-none',
                      c.idx === todayIdx ? 'font-bold text-[var(--color-accent)]' :
                      c.isWeekend ? 'text-[var(--color-ink-4)]' : 'text-[var(--color-ink-2)]',
                    )}>
                      {c.day}
                    </span>
                    <span className={cn(
                      'font-mono text-[7px] uppercase tracking-widest leading-none mt-0.5',
                      c.idx === todayIdx ? 'text-[var(--color-accent)]' :
                      c.isWeekend ? 'text-[var(--color-ink-4)]' : 'text-[var(--color-ink-3)]',
                    )}>
                      {['d','l','m','m','j','v','s'][c.dow]}
                    </span>
                  </div>
                ))}
                {/* "Hoy" floating badge — anchored to today column top */}
                {todayLeft != null && (
                  <div
                    data-today-marker
                    className="absolute -top-1 z-20"
                    style={{ left: todayLeft + DAY_W / 2, transform: 'translateX(-50%)' }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-[var(--color-paper)] bg-[var(--color-accent)] px-1.5 py-px rounded-sm leading-none">
                        Hoy
                      </span>
                      <span className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-[var(--color-accent)]" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Scheduled phase groups ── */}
          {scheduledGroups.map(({ phase, tasks: groupTasks, stats }) => {
            const isCollapsed = collapsedPhases.has(phase);
            const phaseOffset = stats.minStart ? Math.floor((stats.minStart - dateRange.start) / 86400000) : 0;
            const phaseDuration = (stats.minStart && stats.maxEnd) ? Math.max(1, Math.ceil((stats.maxEnd - stats.minStart) / 86400000) + 1) : 0;
            return (
              <React.Fragment key={phase}>
                {/* Phase header row — usa la familia cromática de la fase, igual que la tabla */}
                {(() => {
                  const pc = phaseColor(phase);
                  return (
                <div
                  onClick={() => togglePhase(phase)}
                  className="relative flex border-t border-[var(--color-border)] cursor-pointer hover:brightness-[0.98] transition-all select-none group"
                  style={{ height: PHASE_H, background: `linear-gradient(90deg, ${pc.tint} 0%, transparent 60%)` }}
                >
                  <div
                    className="flex-shrink-0 px-3 border-r border-[var(--color-border)] flex items-center gap-2.5 z-10 relative"
                    style={{ width: LABEL_W, background: `linear-gradient(90deg, ${pc.tint}, ${pc.tint} 60%, var(--color-paper))` }}
                  >
                    {/* Vertical accent bar — full height */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: pc.accent }} />
                    <span className="text-[var(--color-ink-4)] group-hover:text-[var(--color-ink)] transition-colors ml-1">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[13px] font-semibold tracking-tighter text-[var(--color-ink)] truncate leading-tight">{phase}</p>
                      <p className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: pc.accent }}>
                        {stats.total} tarea{stats.total !== 1 ? 's' : ''} · {stats.hours.toFixed(0)}h
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-[4px] bg-[var(--color-paper-3)] rounded-full overflow-hidden shadow-[inset_0_1px_1px_oklch(0%_0_0_/_0.05)]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${stats.pct}%`, background: pc.accent }} />
                      </div>
                      <span className="font-mono text-[10px] font-semibold tabular w-7 text-right" style={{ color: pc.accent }}>{stats.pct}%</span>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0" style={{ width: totalWidth }}>
                    {/* Phase envelope — bracket en color de la fase */}
                    {phaseDuration > 0 && (
                      <>
                        {/* Soft glow behind envelope */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md opacity-30 z-[1]"
                          style={{
                            left: phaseOffset * DAY_W,
                            width: phaseDuration * DAY_W,
                            background: `linear-gradient(90deg, ${pc.tint}, transparent)`,
                          }}
                        />
                        {/* Bracket structure */}
                        <div
                          className="absolute h-[8px] top-1/2 -translate-y-1/2 z-[2]"
                          style={{ left: phaseOffset * DAY_W, width: phaseDuration * DAY_W }}
                        >
                          {/* Bracket left */}
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-sm" style={{ background: pc.accent }} />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[2px] rounded-sm" style={{ background: pc.accent }} />
                          {/* Center line — dashed feel via gradient */}
                          <div
                            className="absolute left-1.5 right-1.5 top-1/2 -translate-y-1/2 h-px opacity-70"
                            style={{ background: `repeating-linear-gradient(90deg, ${pc.accent} 0 4px, transparent 4px 8px)` }}
                          />
                          {/* Bracket right */}
                          <div className="absolute right-0 top-0 bottom-0 w-[2px] rounded-sm" style={{ background: pc.accent }} />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-[2px] rounded-sm" style={{ background: pc.accent }} />
                        </div>
                        {/* Phase label sobre el bracket — pill style */}
                        {phaseDuration > 3 && (
                          <span
                            className="absolute font-mono text-[9px] uppercase tracking-widest font-semibold px-1.5 py-px rounded-sm z-[3]"
                            style={{
                              left: phaseOffset * DAY_W + 8,
                              top: PHASE_H / 2 - 16,
                              background: pc.tint,
                              color: pc.accent,
                            }}
                          >
                            {phase}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                  );
                })()}

                {/* Tasks */}
                {!isCollapsed && groupTasks.map(t => {
                  const offset = Math.floor((new window.Date(t.start_date) - dateRange.start) / 86400000);
                  const duration = Math.max(1, Math.ceil((new window.Date(t.end_date) - new window.Date(t.start_date)) / 86400000) + 1);
                  const isSel = t.id === selectedId;
                  const isHovered = hoveredTask?.id === t.id;
                  const status = STATUS_OPTIONS.find(s => s.value === t.status) || STATUS_OPTIONS[0];
                  const isMilestone = duration <= 1;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelect(t.id)}
                      className={cn(
                        'relative flex border-t border-[var(--color-border-2)] cursor-pointer transition-colors duration-[var(--dur-fast)]',
                        isSel ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-paper-2)]/60',
                      )}
                      style={{ height: ROW_H }}
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 pl-9 pr-3 border-r border-[var(--color-border)] text-[12px] flex items-center gap-2 min-w-0 bg-[var(--color-paper)] z-10 relative',
                          isSel && 'after:absolute after:left-0 after:top-0 after:bottom-0 after:w-[3px] after:bg-[var(--color-accent)]',
                        )}
                        style={{ width: LABEL_W }}
                      >
                        {t.assignee_color
                          ? <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.assignee_color }} />
                          : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--color-paper-4)]" />}
                        <span className={cn(
                          'truncate font-medium text-[var(--color-ink)]',
                          t.status === 'done' && 'line-through text-[var(--color-ink-3)]',
                          t.status === 'cancelled' && 'line-through text-[var(--color-ink-4)]',
                        )}>{t.title}</span>
                        {t.priority === 'critical' && <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-[var(--color-rose)] flex-shrink-0">crit</span>}
                      </div>
                      <div className="relative flex-shrink-0" style={{ width: totalWidth }}>
                        {/* Task bar — refined: status como left strip, body con tint */}
                        {isMilestone ? (
                          // Milestone diamond
                          <div
                            className={cn(
                              'absolute top-1/2 -translate-y-1/2 z-[2] transition-all',
                              isSel && 'scale-110',
                            )}
                            style={{ left: offset * DAY_W + DAY_W / 2 - 7 }}
                            onMouseEnter={() => setHoveredTask(t)}
                            onMouseLeave={() => setHoveredTask(null)}
                          >
                            <div
                              className="w-3.5 h-3.5 rotate-45"
                              style={{
                                background: status.dot,
                                boxShadow: isSel ? `0 0 0 2px var(--color-accent), 0 0 0 4px var(--color-paper)` : undefined,
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'absolute top-1/2 -translate-y-1/2 z-[2] flex items-center transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)]',
                              isSel && 'shadow-[0_0_0_2px_var(--color-accent),0_0_0_4px_var(--color-paper)]',
                              isHovered && !isSel && 'shadow-[0_2px_8px_rgba(0,0,0,0.08)] -translate-y-[calc(50%+1px)]',
                            )}
                            style={{
                              left: offset * DAY_W + 1,
                              width: duration * DAY_W - 2,
                              height: 24,
                              borderRadius: 3,
                              background: status.bg,
                              borderLeft: `3px solid ${status.dot}`,
                            }}
                            onMouseEnter={() => setHoveredTask(t)}
                            onMouseLeave={() => setHoveredTask(null)}
                          >
                            {/* Inner content: avatar + title */}
                            <div className="flex items-center gap-1.5 px-2 min-w-0 flex-1">
                              {duration * DAY_W > 60 && t.assignee_name && (
                                <span
                                  className="w-3.5 h-3.5 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[7px] flex-shrink-0"
                                  style={{ background: t.assignee_color || 'var(--color-accent)' }}
                                >
                                  {t.assignee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              )}
                              {duration * DAY_W > 40 && (
                                <span className="text-[10.5px] font-medium truncate leading-none" style={{ color: status.fg }}>
                                  {t.title}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* ── Unscheduled drop-zone ── */}
          {unscheduledGroups.length > 0 && (
            <>
              <div className="border-t-2 border-dashed border-[var(--color-border)] bg-[var(--color-paper-2)]/40 px-4 py-2.5 flex items-center gap-3">
                <span className="w-1 h-4 rounded-sm bg-[var(--color-amber)]" />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[12px] font-semibold tracking-tighter text-[var(--color-ink)]">
                    Sin programar <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)] ml-1">{unscheduled.length}</span>
                  </p>
                  <p className="text-[10.5px] text-[var(--color-ink-3)] italic mt-0.5">Click en cada tarea para asignarle fechas y verla en el timeline</p>
                </div>
              </div>
              {unscheduledGroups.map(({ phase, tasks: groupTasks, stats }) => {
                const phaseKey = `_unsched_${phase}`;
                const isCollapsed = collapsedPhases.has(phaseKey);
                return (
                  <React.Fragment key={phaseKey}>
                    <div onClick={() => togglePhase(phaseKey)} className="flex border-t border-[var(--color-border-2)] cursor-pointer hover:bg-[var(--color-paper-2)]/60 select-none group">
                      <div className="flex-shrink-0 px-3 py-2 border-r border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-paper)] z-10" style={{ width: LABEL_W }}>
                        <span className="text-[var(--color-ink-4)] group-hover:text-[var(--color-ink)] transition-colors">
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-4)] flex-shrink-0" />
                        <span className="font-display text-[12px] font-semibold tracking-tighter text-[var(--color-ink-2)] flex-1 truncate">{phase}</span>
                        <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{stats.total}</span>
                      </div>
                      <div className="px-3 py-2 text-[10.5px] text-[var(--color-ink-4)] italic">{stats.hours > 0 && `${stats.hours.toFixed(0)}h estimadas`}</div>
                    </div>
                    {!isCollapsed && groupTasks.map(t => (
                      <div
                        key={t.id}
                        onClick={() => onSelect(t.id)}
                        className={cn(
                          'flex border-t border-[var(--color-border-2)] cursor-pointer transition-colors duration-[var(--dur-fast)]',
                          t.id === selectedId ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-paper-2)]/60',
                        )}
                      >
                        <div
                          className={cn(
                            'flex-shrink-0 pl-9 pr-3 py-2 border-r border-[var(--color-border)] text-[12px] flex items-center gap-2 min-w-0 bg-[var(--color-paper)] z-10 relative',
                            t.id === selectedId && 'after:absolute after:left-0 after:top-0 after:bottom-0 after:w-[3px] after:bg-[var(--color-accent)]',
                          )}
                          style={{ width: LABEL_W }}
                        >
                          {t.assignee_color
                            ? <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.assignee_color }} />
                            : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--color-paper-4)]" />}
                          <span className="truncate text-[var(--color-ink-2)] italic">{t.title}</span>
                        </div>
                        <div className="flex-1 px-3 py-2 text-[10.5px] text-[var(--color-ink-4)] italic">→ asignar fechas</div>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* ── Hover tooltip ── */}
        {hoveredTask && hoveredTask.start_date && hoveredTask.end_date && (
          <HoverTooltip task={hoveredTask} />
        )}
      </div>
    </div>
  );
}

// ─── Background layer: weekend tint + week separators + today column + month dividers ──
function BackgroundLayer({ dayCells, monthSpans, todayLeft, totalWidth, DAY_W, LABEL_W }) {
  return (
    <div
      className="absolute top-0 right-0 pointer-events-none z-0"
      style={{ left: LABEL_W, width: totalWidth, bottom: 0 }}
    >
      {/* Weekend columns */}
      {dayCells.filter(c => c.isWeekend).map(c => (
        <div
          key={`we-${c.idx}`}
          className="absolute top-0 bottom-0 bg-[var(--color-paper-3)] opacity-50"
          style={{ left: c.idx * DAY_W, width: DAY_W }}
        />
      ))}
      {/* Week separators (every Monday) */}
      {dayCells.filter(c => c.isWeekStart).map(c => (
        <div
          key={`ws-${c.idx}`}
          className="absolute top-0 bottom-0 w-px bg-[var(--color-border-2)] opacity-60"
          style={{ left: c.idx * DAY_W }}
        />
      ))}
      {/* Month dividers — más fuertes */}
      {monthSpans.map((m, i) => i > 0 && (
        <div
          key={`md-${i}`}
          className="absolute top-0 bottom-0 w-px bg-[var(--color-border)]"
          style={{ left: m.left }}
        />
      ))}
      {/* Today column highlight */}
      {todayLeft != null && (
        <>
          <div
            className="absolute top-0 bottom-0 bg-[var(--color-accent-soft)] opacity-50"
            style={{ left: todayLeft, width: DAY_W }}
          />
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[var(--color-accent)] z-[1]"
            style={{ left: todayLeft + DAY_W / 2 - 1 }}
          />
        </>
      )}
    </div>
  );
}

// ─── Empty state — render bonito cuando el Gantt no tiene tareas con fechas ────
function GanttEmptyState({ totalTasks, unscheduledGroups, selectedId, onSelect, collapsedPhases, togglePhase }) {
  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
      {/* Hero zone — illustration tipográfica + call to action */}
      <div className="relative overflow-hidden p-10 border-b border-[var(--color-border)]">
        {/* Decorative background — gradient mesh limited to the hero zone */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: 'oklch(88% 0.08 264)' }} />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'oklch(88% 0.07 295)' }} />
        </div>
        {/* Decorative grid lines — fake gantt */}
        <div className="absolute inset-0 pointer-events-none opacity-50" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 27px, oklch(85% 0.012 248 / 0.4) 27px 28px)',
        }} />
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 39px, oklch(85% 0.012 248 / 0.5) 39px 40px)',
        }} />

        <div className="relative max-w-md mx-auto text-center">
          {/* Mini fake-gantt illustration */}
          <div className="mx-auto mb-6 w-fit">
            <div className="flex flex-col gap-1.5 items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1.5 rounded-sm bg-[oklch(46%_0.20_264)]" />
                <div className="w-16 h-3.5 rounded bg-[oklch(46%_0.20_264)] border-l-[3px] border-[oklch(36%_0.20_264)]" />
                <div className="w-12 h-3.5 rounded bg-[oklch(94%_0.035_264)] border-l-[3px] border-[oklch(46%_0.20_264)]" />
              </div>
              <div className="flex items-center gap-2 pl-10">
                <div className="w-6 h-1.5 rounded-sm bg-[oklch(52%_0.16_158)]" />
                <div className="w-20 h-3.5 rounded bg-[oklch(93%_0.055_155)] border-l-[3px] border-[oklch(52%_0.16_158)]" />
              </div>
              <div className="flex items-center gap-2 pl-4">
                <div className="w-10 h-1.5 rounded-sm bg-[oklch(54%_0.18_295)]" />
                <div className="w-14 h-3.5 rounded bg-[oklch(94%_0.045_295)] border-l-[3px] border-[oklch(54%_0.18_295)]" />
                <div className="w-8 h-3.5 rounded bg-[oklch(94%_0.045_295)] border-l-[3px] border-[oklch(54%_0.18_295)]" />
              </div>
            </div>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-text)] mb-3">Tu timeline está vacío</p>
          <h2 className="font-display text-[26px] leading-tight tracking-tighter text-[var(--color-ink)] mb-3">
            Asigná fechas a las {totalTasks} tareas para activar el Gantt
          </h2>
          <p className="text-[13px] text-[var(--color-ink-2)] leading-relaxed mb-6 max-w-sm mx-auto">
            Click en cualquier tarea de la lista de abajo, andá a <span className="font-mono text-[11px] bg-[var(--color-paper-3)] px-1.5 py-0.5 rounded">Inicio</span> y <span className="font-mono text-[11px] bg-[var(--color-paper-3)] px-1.5 py-0.5 rounded">Fin</span> en el side panel, y la barra aparece automáticamente en el timeline.
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--color-ink-3)]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              Bars por status
            </span>
            <span className="text-[var(--color-ink-4)]">·</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rotate-45 bg-[var(--color-emerald)]" />
              Milestones (1 día)
            </span>
            <span className="text-[var(--color-ink-4)]">·</span>
            <span className="flex items-center gap-1">
              <span className="w-px h-3 bg-[var(--color-accent)]" />
              Línea "hoy"
            </span>
          </div>
        </div>
      </div>

      {/* Lista de tareas sin programar — agrupadas por fase, click para abrir y asignar fechas */}
      <div className="max-h-[calc(100vh-460px)] overflow-auto">
        <div className="px-4 py-2.5 bg-[var(--color-paper-2)] border-b border-[var(--color-border-2)] flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest font-semibold text-[var(--color-ink-2)]">Pendientes de programar</span>
          <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{totalTasks}</span>
        </div>
        {unscheduledGroups.map(({ phase, tasks: groupTasks, stats }) => {
          const phaseKey = `_empty_${phase}`;
          const isCollapsed = collapsedPhases.has(phaseKey);
          const pc = phaseColor(phase);
          return (
            <React.Fragment key={phaseKey}>
              <div
                onClick={() => togglePhase(phaseKey)}
                className="relative flex items-center gap-2.5 px-4 py-2.5 border-t border-[var(--color-border-2)] cursor-pointer hover:brightness-[0.98] transition-all select-none group"
                style={{ background: `linear-gradient(90deg, ${pc.tint} 0%, transparent 30%)` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: pc.accent }} />
                <span className="text-[var(--color-ink-4)] group-hover:text-[var(--color-ink)] transition-colors ml-1">
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
                <span className="font-display text-[13px] font-semibold tracking-tighter text-[var(--color-ink)] flex-1">{phase}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest font-medium px-1.5 py-px rounded-sm" style={{ color: pc.accent, background: pc.tint }}>
                  {stats.total} sin fechas
                </span>
                {stats.hours > 0 && <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{stats.hours.toFixed(0)}h</span>}
              </div>
              {!isCollapsed && groupTasks.map(t => {
                const status = STATUS_OPTIONS.find(s => s.value === t.status) || STATUS_OPTIONS[0];
                const isSel = t.id === selectedId;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={cn(
                      'relative flex items-center gap-3 px-4 py-2.5 pl-10 border-t border-[var(--color-border-2)] cursor-pointer transition-colors',
                      isSel ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-paper-2)]/70',
                    )}
                  >
                    {isSel && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-accent)]" />}
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.assignee_color || pc.accent }} />
                    <span className="text-[12.5px] font-medium text-[var(--color-ink)] flex-1 truncate">{t.title}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-px rounded font-mono text-[9px] uppercase tracking-wider" style={{ background: status.bg, color: status.fg }}>
                      {status.label}
                    </span>
                    {t.estimated_hours && <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{t.estimated_hours}h</span>}
                    <span className="font-mono text-[10px] text-[var(--color-accent)] flex items-center gap-1">
                      Programar →
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hover tooltip — refined card with task details. Position fixed, follows cursor. ──
function HoverTooltip({ task }) {
  const status = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0];
  const priority = PRIORITY_OPTIONS.find(p => p.value === task.priority) || PRIORITY_OPTIONS[1];
  const [pos, setPos] = React.useState({ x: -9999, y: -9999 });

  React.useEffect(() => {
    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // compute duration
  const start = new window.Date(task.start_date);
  const end = new window.Date(task.end_date);
  const duration = Math.max(1, Math.ceil((end - start) / 86400000) + 1);

  const left = Math.min(pos.x + 14, window.innerWidth - 280);
  const top = Math.min(pos.y + 14, window.innerHeight - 200);

  return (
    <div
      className="fixed z-[100] pointer-events-none w-[260px] bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden"
      style={{ left, top }}
    >
      {/* Header strip with status color */}
      <div className="px-3 py-2 border-b border-[var(--color-border-2)] flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm" style={{ background: status.dot }} />
        <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: status.fg }}>{status.label}</span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-widest" style={{ color: priority.fg }}>{priority.label}</span>
      </div>
      {/* Body */}
      <div className="px-3 py-2.5 space-y-2">
        <p className="font-display text-[13px] font-semibold tracking-tighter text-[var(--color-ink)] leading-tight">{task.title}</p>
        {task.phase && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">{task.phase}</p>
        )}
        <div className="flex items-center gap-3 pt-1 border-t border-[var(--color-border-2)]">
          <div className="flex-1">
            <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-ink-4)]">Fechas</p>
            <p className="font-mono text-[10.5px] tabular text-[var(--color-ink-2)] mt-0.5">
              {task.start_date.slice(5)} → {task.end_date.slice(5)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--color-ink-4)]">Duración</p>
            <p className="font-mono text-[10.5px] tabular text-[var(--color-ink-2)] mt-0.5">{duration} día{duration !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {task.assignee_name && (
          <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border-2)]">
            <span
              className="w-5 h-5 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[9px] flex-shrink-0"
              style={{ background: task.assignee_color || 'var(--color-accent)' }}
            >
              {task.assignee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <span className="text-[11px] text-[var(--color-ink-2)]">{task.assignee_name}</span>
          </div>
        )}
        {task.estimated_hours && (
          <p className="font-mono text-[10px] text-[var(--color-ink-3)]">
            <span className="text-[var(--color-ink-4)]">Estimado:</span> <span className="tabular text-[var(--color-ink-2)]">{task.estimated_hours}h</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Side panel ─────────────────────────────────────────────────────────────
function TaskDetailPanel({ task, members, onClose, onUpdate, onDelete, isSaving }) {
  const [local, setLocal] = useState(task);
  const [debounce, setDebounce] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { setLocal(task); setHasChanges(false); }, [task.id, task.updated_at]);

  const queueSave = (fields) => {
    setLocal(prev => ({ ...prev, ...fields }));
    setHasChanges(true);
    if (debounce) clearTimeout(debounce);
    const id = setTimeout(() => { onUpdate(fields); setHasChanges(false); }, 600);
    setDebounce(id);
  };

  const saveStatus = isSaving ? 'Guardando…' : (hasChanges ? 'Sin guardar' : 'Guardado');
  const saveColor = isSaving ? 'var(--color-accent)' : (hasChanges ? 'var(--color-amber)' : 'var(--color-emerald)');

  return (
    <aside className="w-[408px] flex-shrink-0 sticky top-[112px] h-[calc(100vh-128px)]">
      <Card className="h-full overflow-hidden flex flex-col">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-paper)]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Detalle</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest" style={{ color: saveColor }}>
              <span className="w-1 h-1 rounded-full" style={{ background: saveColor }} />
              {saveStatus}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onDelete} title="Eliminar">
              <Trash2 className="w-3.5 h-3.5 text-[var(--color-rose)]" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} title="Cerrar">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title — large, editable */}
          <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border-2)]">
            <input
              value={local.title || ''}
              onChange={e => queueSave({ title: e.target.value })}
              className="w-full font-display text-[20px] font-semibold tracking-tighter text-[var(--color-ink)] bg-transparent focus:outline-none placeholder:text-[var(--color-ink-4)]"
              placeholder="Título de la tarea"
            />
          </div>

          {/* Description */}
          <div className="px-5 py-4 border-b border-[var(--color-border-2)]">
            <FieldLabel>Descripción</FieldLabel>
            <Textarea
              value={local.description || ''}
              onChange={e => queueSave({ description: e.target.value })}
              placeholder="Notas, contexto, links…"
              rows={4}
              className="mt-1.5 border-0 px-0 py-0 focus:outline-none"
            />
          </div>

          {/* Meta grid */}
          <div className="px-5 py-4 border-b border-[var(--color-border-2)] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <Select value={local.status} onChange={v => queueSave({ status: v })} className="h-8 text-[12px]">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Prioridad">
                <Select value={local.priority} onChange={v => queueSave({ priority: v })} className="h-8 text-[12px]">
                  {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Fase">
              <Input value={local.phase || ''} onChange={e => queueSave({ phase: e.target.value })} placeholder="ej: Pre-launch" className="h-8 text-[12px]" />
            </Field>
            <Field label="Asignada a">
              <Select value={local.assignee_id || 'unassigned'} onChange={v => queueSave({ assignee_id: v === 'unassigned' ? null : v })} className="h-8 text-[12px]">
                <option value="unassigned">Sin asignar</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </Select>
            </Field>
          </div>

          {/* Dates + hours */}
          <div className="px-5 py-4 border-b border-[var(--color-border-2)] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Inicio">
                <Input type="date" value={(local.start_date || '').slice(0, 10)} onChange={e => queueSave({ start_date: e.target.value || null })} className="h-8 text-[12px] font-mono" />
              </Field>
              <Field label="Fin">
                <Input type="date" value={(local.end_date || '').slice(0, 10)} onChange={e => queueSave({ end_date: e.target.value || null })} className="h-8 text-[12px] font-mono" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estimado (h)">
                <Input type="number" step="0.5" value={local.estimated_hours || ''} onChange={e => queueSave({ estimated_hours: e.target.value ? parseFloat(e.target.value) : null })} className="h-8 text-[12px] tabular font-mono" />
              </Field>
              <Field label="Real (h)">
                <Input type="number" step="0.5" value={local.actual_hours || ''} onChange={e => queueSave({ actual_hours: e.target.value ? parseFloat(e.target.value) : null })} className="h-8 text-[12px] tabular font-mono" />
              </Field>
            </div>
          </div>

          {/* Tags */}
          <div className="px-5 py-4 border-b border-[var(--color-border-2)]">
            <Field label="Tags">
              <Input
                value={(local.tags || []).join(', ')}
                onChange={e => queueSave({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="separados por coma"
                className="h-8 text-[12px]"
              />
            </Field>
          </div>

          {/* Comments */}
          <CommentsSection taskId={task.id} />
        </div>
      </Card>
    </aside>
  );
}

function FieldLabel({ children }) {
  return <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">{children}</p>;
}

function Field({ label, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function CommentsSection({ taskId }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const { data: comments = [] } = useQuery({
    queryKey: ['internal-comments', taskId],
    queryFn: () => api.listComments(taskId),
  });
  const addMutation = useMutation({
    mutationFn: (b) => api.addComment(taskId, b),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internal-comments', taskId] }); setBody(''); },
  });

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-3 h-3 text-[var(--color-ink-3)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
          Comentarios <span className="text-[var(--color-ink-4)]">({comments.length})</span>
        </span>
      </div>

      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {comments.map(c => (
          <div key={c.id} className="border-l-2 border-[var(--color-border)] pl-3 py-1">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-medium text-[12px] text-[var(--color-ink)]">{c.author_email.split('@')[0]}</span>
              <span className="font-mono text-[10px] text-[var(--color-ink-4)]">
                {new window.Date(c.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <p className="text-[12px] text-[var(--color-ink-2)] leading-relaxed whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-[11px] text-[var(--color-ink-4)] italic">Sin comentarios todavía.</p>}
      </div>

      <div className="mt-3 flex gap-2">
        <Textarea
          value={body} onChange={e => setBody(e.target.value)}
          placeholder="Agregar comentario…"
          rows={2}
          className="text-[12px]"
        />
        <Button size="sm" variant="primary" disabled={!body.trim() || addMutation.isPending} onClick={() => addMutation.mutate(body.trim())} className="self-end">
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
