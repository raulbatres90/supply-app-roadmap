/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 * Plan de negocio editable — Canvas + preguntas clave, auto-save inline.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Button, Textarea, Input, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import * as api from '@/lib/api';

const STATUS = [
  { value: 'pending',     label: 'Pendiente', dot: 'var(--color-ink-3)',   bg: 'var(--color-paper-3)',     fg: 'var(--color-ink-2)' },
  { value: 'in_progress', label: 'En curso',  dot: 'var(--color-blue)',    bg: 'var(--color-blue-soft)',   fg: 'var(--color-blue)' },
  { value: 'decided',     label: 'Decidido',  dot: 'var(--color-emerald)', bg: 'var(--color-emerald-soft)',fg: 'var(--color-emerald)' },
];

const ACCENT_MAP = {
  accent:  'var(--color-accent)',
  blue:    'var(--color-blue)',
  teal:    'var(--color-teal)',
  violet:  'var(--color-violet)',
  emerald: 'var(--color-emerald)',
  pink:    'var(--color-pink)',
  amber:   'var(--color-amber)',
};
const ACCENT_TINT = {
  accent:  'var(--color-accent-tint)',
  blue:    'var(--color-blue-tint)',
  teal:    'var(--color-teal-tint)',
  violet:  'var(--color-violet-tint)',
  emerald: 'var(--color-emerald-tint)',
  pink:    'var(--color-pink-tint)',
  amber:   'var(--color-amber-tint)',
};

export default function BusinessPlanPage() {
  const queryClient = useQueryClient();
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['internal-plan'],
    queryFn: api.listPlanBlocks,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['internal-plan'] });

  const updateMut = useMutation({
    mutationFn: ({ id, fields }) => api.updatePlanBlock(id, fields),
    onSuccess: invalidate,
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al guardar'),
  });
  const createMut = useMutation({
    mutationFn: api.createPlanBlock,
    onSuccess: () => { invalidate(); toast.success('Bloque agregado'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al crear'),
  });
  const deleteMut = useMutation({
    mutationFn: api.deletePlanBlock,
    onSuccess: () => { invalidate(); toast.success('Eliminado'); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al eliminar'),
  });

  const canvas = useMemo(() => blocks.filter(b => b.category === 'canvas'), [blocks]);
  const questions = useMemo(() => blocks.filter(b => b.category === 'question'), [blocks]);

  // Agrupar preguntas por group_label preservando orden de aparición
  const questionGroups = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      const key = q.group_label || 'Otras';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(q);
    }
    return Array.from(map.entries());
  }, [questions]);

  const toggleGroup = (g) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next;
  });

  // Stats
  const stats = useMemo(() => {
    const decided = blocks.filter(b => b.status === 'decided').length;
    const critical = blocks.filter(b => b.is_critical).length;
    const criticalDecided = blocks.filter(b => b.is_critical && b.status === 'decided').length;
    return { total: blocks.length, decided, critical, criticalDecided, pct: blocks.length ? Math.round(decided / blocks.length * 100) : 0 };
  }, [blocks]);

  if (isLoading) {
    return <div className="px-6 py-24 text-center font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Cargando plan…</div>;
  }

  return (
    <div className="px-6 py-6 space-y-8 max-w-[1280px] mx-auto">
      {/* ── Header ── */}
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-text)] mb-2">Plan de negocio</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[32px] leading-tight tracking-tighter text-[var(--color-ink)]">Del producto al negocio</h1>
            <p className="text-[13px] text-[var(--color-ink-2)] mt-1 max-w-xl">
              El Canvas y las preguntas clave. Editá cualquier bloque, cambiá su estado, agregá los tuyos. Se guarda solo.
            </p>
          </div>
          {/* progreso */}
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-rose)]">Críticas decididas</p>
              <p className="font-display text-[22px] tracking-tighter tabular" style={{ color: stats.criticalDecided === stats.critical && stats.critical > 0 ? 'var(--color-emerald)' : 'var(--color-rose)' }}>
                {stats.criticalDecided}<span className="text-[14px] text-[var(--color-ink-3)]">/{stats.critical}</span>
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-3)]">Progreso total</p>
              <p className="font-display text-[22px] tracking-tighter tabular text-[var(--color-accent)]">{stats.pct}<span className="text-[14px] text-[var(--color-ink-3)]">%</span></p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sección Canvas ── */}
      <section>
        <SectionTitle num="1" title="Business Model Canvas" sub="Las 9 piezas de cómo gana dinero DFA" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {canvas.map(b => (
            <CanvasCard key={b.id} block={b} onUpdate={(fields) => updateMut.mutate({ id: b.id, fields })} onDelete={() => deleteMut.mutate(b.id)} />
          ))}
          <AddCard
            label="Agregar bloque al Canvas"
            onAdd={() => createMut.mutate({ category: 'canvas', title: 'Nuevo bloque', status: 'pending', accent: 'accent', position: (canvas.at(-1)?.position || 9) + 1 })}
          />
        </div>
      </section>

      {/* ── Sección Preguntas ── */}
      <section>
        <SectionTitle num="2" title="Preguntas clave" sub="Lo que vuelve el plan específico en vez de genérico" />
        <div className="space-y-5">
          {questionGroups.map(([group, items]) => {
            const isCollapsed = collapsedGroups.has(group);
            const decided = items.filter(i => i.status === 'decided').length;
            return (
              <div key={group}>
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-2.5 mb-2.5 group select-none"
                >
                  <span className="text-[var(--color-ink-4)] group-hover:text-[var(--color-ink)] transition-colors">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                  <h3 className="font-display text-[16px] font-semibold tracking-tighter text-[var(--color-ink)]">{group}</h3>
                  <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{decided}/{items.length} decididas</span>
                  <div className="flex-1 h-px bg-[var(--color-border-2)]" />
                </button>
                {!isCollapsed && (
                  <div className="space-y-2.5 pl-6">
                    {items.map(q => (
                      <QuestionCard key={q.id} block={q} onUpdate={(fields) => updateMut.mutate({ id: q.id, fields })} onDelete={() => deleteMut.mutate(q.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="pl-6">
            <AddCard
              label="Agregar pregunta o planteamiento propio"
              wide
              onAdd={() => createMut.mutate({ category: 'question', group_label: '✍️ Nuestras preguntas', title: 'Nueva pregunta', status: 'pending', position: 999 })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ num, title, sub }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="font-mono text-[12px] font-semibold text-[var(--color-paper)] bg-[var(--color-accent)] w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 self-center">{num}</span>
      <div>
        <h2 className="font-display text-[22px] tracking-tighter text-[var(--color-ink)]">{title}</h2>
        <p className="text-[12px] text-[var(--color-ink-3)]">{sub}</p>
      </div>
    </div>
  );
}

// ── Card del Canvas: título editable + body editable + status + accent strip ──
function CanvasCard({ block, onUpdate, onDelete }) {
  const [local, setLocal] = useState(block);
  const [debounce, setDebounce] = useState(null);
  useEffect(() => setLocal(block), [block.id, block.updated_at]);

  const queue = (fields) => {
    setLocal(prev => ({ ...prev, ...fields }));
    if (debounce) clearTimeout(debounce);
    setDebounce(setTimeout(() => onUpdate(fields), 600));
  };

  const accent = ACCENT_MAP[block.accent] || 'var(--color-accent)';
  const tint = ACCENT_TINT[block.accent] || 'var(--color-accent-tint)';
  const st = STATUS.find(s => s.value === local.status) || STATUS[0];

  return (
    <div className="relative bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden p-4 group">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent 80%)` }} />
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-50 blur-2xl" style={{ background: tint }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <input
            value={local.title || ''}
            onChange={e => queue({ title: e.target.value })}
            className="font-display text-[14px] font-semibold tracking-tighter text-[var(--color-ink)] bg-transparent focus:outline-none flex-1 min-w-0"
          />
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-4)] hover:text-[var(--color-rose)] flex-shrink-0" title="Eliminar bloque">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <Textarea
          value={local.body || ''}
          onChange={e => queue({ body: e.target.value })}
          placeholder="Escribí acá…"
          rows={3}
          className="text-[13px] border-0 px-0 py-0 focus:outline-none bg-transparent leading-relaxed resize-none mb-2"
        />
        <StatusChips value={local.status} onChange={v => queue({ status: v })} />
      </div>
    </div>
  );
}

// ── Card de pregunta: prompt fijo + respuesta editable + status + crítica ──
function QuestionCard({ block, onUpdate, onDelete }) {
  const [local, setLocal] = useState(block);
  const [debounce, setDebounce] = useState(null);
  useEffect(() => setLocal(block), [block.id, block.updated_at]);

  const queue = (fields) => {
    setLocal(prev => ({ ...prev, ...fields }));
    if (debounce) clearTimeout(debounce);
    setDebounce(setTimeout(() => onUpdate(fields), 600));
  };

  const answered = (local.body || '').trim().length > 0;

  return (
    <div className={cn(
      'relative bg-[var(--color-paper)] border rounded-xl shadow-[var(--shadow-card)] overflow-hidden p-4 group',
      block.is_critical ? 'border-[var(--color-rose)]/40' : 'border-[var(--color-border)]',
    )}>
      {block.is_critical && <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[var(--color-rose)]" />}
      <div className={cn('relative', block.is_critical && 'pl-2')}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {block.is_critical && (
              <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-[var(--color-rose)] bg-[var(--color-rose-soft)] px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">crítica</span>
            )}
            <input
              value={local.title || ''}
              onChange={e => queue({ title: e.target.value })}
              className="font-medium text-[13.5px] text-[var(--color-ink)] bg-transparent focus:outline-none flex-1 min-w-0 leading-snug"
            />
          </div>
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-4)] hover:text-[var(--color-rose)] flex-shrink-0" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <Textarea
          value={local.body || ''}
          onChange={e => queue({ body: e.target.value })}
          placeholder="Escribí acá la respuesta del equipo…"
          rows={2}
          className={cn(
            'text-[13px] leading-relaxed resize-none mb-2.5 mt-1',
            answered ? 'bg-[var(--color-paper-2)]' : 'bg-[var(--color-amber-tint)]/40',
          )}
        />
        <StatusChips value={local.status} onChange={v => queue({ status: v })} />
      </div>
    </div>
  );
}

function StatusChips({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {STATUS.map(s => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all border',
              active ? 'shadow-sm' : 'opacity-50 hover:opacity-100 border-transparent',
            )}
            style={active ? { background: s.bg, color: s.fg, borderColor: s.dot } : { color: 'var(--color-ink-4)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? s.dot : 'var(--color-ink-4)' }} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function AddCard({ label, onAdd, wide }) {
  return (
    <button
      onClick={onAdd}
      className={cn(
        'border-2 border-dashed border-[var(--color-border)] rounded-xl p-4 flex items-center justify-center gap-2 text-[var(--color-ink-3)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-tint)]/30 transition-all min-h-[120px]',
        wide && 'w-full min-h-0 py-3',
      )}
    >
      <Plus className="w-4 h-4" />
      <span className="text-[12.5px] font-medium">{label}</span>
    </button>
  );
}
