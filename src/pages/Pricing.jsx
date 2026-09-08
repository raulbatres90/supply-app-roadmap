/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * Pricing — propuesta de precios, editable por el equipo.
 *
 * Guarda en internal_plan_blocks con category='pricing'. La tabla ya aceptaba
 * cualquier categoría, así que no hizo falta tocar el backend: comparte
 * endpoints, autoguardado y colaboración con el Canvas del Plan.
 *
 * El contenido inicial es una propuesta cargada desde db/seed-pricing.sql. Todo
 * se edita acá; re-ejecutar ese archivo la restaura y pisa lo que el equipo
 * haya escrito.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Textarea, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import * as api from '@/lib/api';

const STATUS = [
  { value: 'pending', label: 'Por decidir', dot: 'var(--color-ink-3)', bg: 'var(--color-paper-3)', fg: 'var(--color-ink-2)' },
  { value: 'in_progress', label: 'En debate', dot: 'var(--color-blue)', bg: 'var(--color-blue-soft)', fg: 'var(--color-blue)' },
  { value: 'decided', label: 'Acordado', dot: 'var(--color-emerald)', bg: 'var(--color-emerald-soft)', fg: 'var(--color-emerald)' },
];

const ACCENT = {
  accent: 'var(--color-accent)', blue: 'var(--color-blue)', teal: 'var(--color-teal)',
  violet: 'var(--color-violet)', emerald: 'var(--color-emerald)', pink: 'var(--color-pink)',
  amber: 'var(--color-amber)', rose: 'var(--color-rose)', ink: 'var(--color-ink-3)',
};

// Mismo hook que el Canvas: sin esto el texto largo queda recortado tras N filas.
function useAutoGrow(value) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(() => new Set());

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['internal-plan'],
    queryFn: api.listPlanBlocks,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['internal-plan'] });
  const updateMut = useMutation({
    mutationFn: ({ id, fields }) => api.updatePlanBlock(id, fields),
    onSuccess: invalidate,
    onError: e => toast.error(e?.response?.data?.error || 'No se pudo guardar'),
  });
  const createMut = useMutation({
    mutationFn: api.createPlanBlock,
    onSuccess: () => { invalidate(); toast.success('Bloque agregado'); },
  });
  const deleteMut = useMutation({
    mutationFn: api.deletePlanBlock,
    onSuccess: () => { invalidate(); toast.success('Bloque eliminado'); },
  });

  const grupos = useMemo(() => {
    const pricing = all.filter(b => b.category === 'pricing');
    const map = new Map();
    for (const b of pricing) {
      const g = b.group_label || 'Sin grupo';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(b);
    }
    return [...map.entries()];
  }, [all]);

  const stats = useMemo(() => {
    const p = all.filter(b => b.category === 'pricing');
    const criticas = p.filter(b => b.is_critical);
    return {
      total: p.length,
      acordadas: p.filter(b => b.status === 'decided').length,
      criticas: criticas.length,
      criticasAcordadas: criticas.filter(b => b.status === 'decided').length,
    };
  }, [all]);

  const toggle = g => setCollapsed(prev => {
    const n = new Set(prev);
    if (n.has(g)) n.delete(g); else n.add(g);
    return n;
  });

  if (isLoading) {
    return <div className="px-6 py-24 text-center font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Cargando propuesta…</div>;
  }

  return (
    <div className="px-6 py-6 space-y-8 max-w-[1800px] mx-auto">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-text)] mb-2">Modelo de negocio</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[32px] leading-tight tracking-tighter text-[var(--color-ink)]">Cuánto cobrar</h1>
            <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)] mt-1 max-w-[70ch]">
              Una propuesta para discutir, no una decisión tomada. Editá cualquier bloque,
              cambiá su estado, agregá los tuyos. Se guarda solo y lo ven los cuatro.
            </p>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-rose)]">Críticas acordadas</p>
              <p className="font-display text-[22px] tracking-tighter tabular"
                 style={{ color: stats.criticasAcordadas === stats.criticas && stats.criticas > 0 ? 'var(--color-emerald)' : 'var(--color-rose)' }}>
                {stats.criticasAcordadas}<span className="text-[14px] text-[var(--color-ink-3)]">/{stats.criticas}</span>
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-3)]">Bloques</p>
              <p className="font-display text-[22px] tracking-tighter tabular text-[var(--color-accent)]">
                {stats.acordadas}<span className="text-[14px] text-[var(--color-ink-3)]">/{stats.total}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Resumen de la propuesta: lo único no editable, se deriva de los bloques */}
      <ResumenPlanes bloques={all.filter(b => b.category === 'pricing')} />

      {grupos.map(([grupo, bloques]) => {
        const cerrado = collapsed.has(grupo);
        const acordados = bloques.filter(b => b.status === 'decided').length;
        return (
          <section key={grupo}>
            <button onClick={() => toggle(grupo)} className="w-full flex items-center gap-2.5 mb-3 group select-none">
              <span className="text-[var(--color-ink-4)] group-hover:text-[var(--color-ink)] transition-colors">
                {cerrado ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
              <h2 className="font-display text-[21px] font-semibold tracking-tighter text-[var(--color-ink)]">{grupo}</h2>
              <span className="font-mono text-[10px] tabular text-[var(--color-ink-3)]">{acordados}/{bloques.length} acordados</span>
              <div className="flex-1 h-px bg-[var(--color-border-2)]" />
            </button>

            {!cerrado && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {bloques.map(b => (
                  <Bloque
                    key={b.id}
                    block={b}
                    onUpdate={fields => updateMut.mutate({ id: b.id, fields })}
                    onDelete={() => deleteMut.mutate(b.id)}
                  />
                ))}
                <AddCard
                  label="Agregar bloque a esta sección"
                  onAdd={() => createMut.mutate({
                    category: 'pricing', group_label: grupo, title: 'Nuevo bloque',
                    status: 'pending', accent: 'accent', position: 900,
                  })}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ── Resumen visual de los tres planes ───────────────────────────────────────
// Lee los títulos de los bloques del grupo "2 · Propuesta de planes", así que
// si el equipo cambia un precio en el texto, acá se refleja.
function ResumenPlanes({ bloques }) {
  const planes = bloques
    .filter(b => (b.group_label || '').includes('Propuesta de planes'))
    .filter(b => /·/.test(b.title || ''))
    .map(b => {
      const [nombre, precio] = (b.title || '').split('·').map(x => x.trim());
      return { id: b.id, nombre, precio, accent: b.accent, status: b.status };
    });
  if (planes.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {planes.map(p => {
        const color = ACCENT[p.accent] || 'var(--color-accent)';
        return (
          <div key={p.id} className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-card)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, transparent 80%)` }} />
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color }}>{p.nombre}</p>
            <p className="font-display text-[20px] tracking-tighter text-[var(--color-ink)] leading-tight">{p.precio}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Tarjeta editable ────────────────────────────────────────────────────────
function Bloque({ block, onUpdate, onDelete }) {
  const { local, queue, flush } = useAutosave(block, onUpdate);
  const bodyRef = useAutoGrow(local.body);
  const color = ACCENT[block.accent] || 'var(--color-accent)';
  const st = STATUS.find(s => s.value === local.status) || STATUS[0];

  return (
    <div className={cn(
      'relative bg-[var(--color-paper)] border rounded-xl shadow-[var(--shadow-card)] overflow-hidden p-5 group',
      block.is_critical ? 'border-[var(--color-rose)]/40' : 'border-[var(--color-border)]',
    )}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, transparent 80%)` }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {block.is_critical && (
              <span className="font-mono text-[8px] uppercase tracking-widest font-bold text-[var(--color-rose)] bg-[var(--color-rose-soft)] px-1.5 py-0.5 rounded mt-1 flex-shrink-0">
                clave
              </span>
            )}
            <input
              value={local.title || ''}
              onChange={e => queue({ title: e.target.value })}
              onBlur={flush}
              className="font-display text-[19px] font-semibold tracking-tighter text-[var(--color-ink)] bg-transparent focus:outline-none flex-1 min-w-0"
            />
          </div>
          <button onClick={onDelete} title="Eliminar bloque"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-4)] hover:text-[var(--color-rose)] flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <Textarea
          ref={bodyRef}
          value={local.body || ''}
          onChange={e => queue({ body: e.target.value })}
          onBlur={flush}
          placeholder="Escribí acá…"
          rows={1}
          className="text-[15.5px] leading-[1.75] border-0 px-0 py-0 focus:outline-none bg-transparent resize-none mb-4 overflow-hidden whitespace-pre-wrap"
        />

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS.map(o => {
            const on = local.status === o.value;
            return (
              <button key={o.value} type="button"
                onClick={() => { queue({ status: o.value }); flush(); }}
                className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] uppercase tracking-widest transition-all')}
                style={on
                  ? { background: o.bg, color: o.fg, fontWeight: 600 }
                  : { color: 'var(--color-ink-4)' }}>
                <span className="w-1 h-1 rounded-full" style={{ background: on ? o.dot : 'var(--color-ink-4)' }} />
                {o.label}
              </button>
            );
          })}
          <span className="flex-1" />
          <button type="button"
            onClick={() => { queue({ is_critical: !local.is_critical }); flush(); }}
            title="Marcar como decisión clave"
            className="font-mono text-[9.5px] uppercase tracking-widest text-[var(--color-ink-4)] hover:text-[var(--color-rose)] transition-colors px-1.5">
            {local.is_critical ? 'quitar clave' : 'marcar clave'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCard({ label, onAdd }) {
  return (
    <button onClick={onAdd}
      className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-5 flex items-center justify-center gap-2 text-[var(--color-ink-3)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-tint)]/30 transition-all min-h-[120px] w-full">
      <Plus className="w-4 h-4" />
      <span className="text-[13px]">{label}</span>
    </button>
  );
}

// Mismo autoguardado que el Canvas: estado local inmediato, debounce por ref
// acumulando todos los campos, y un guard para que el refetch de 10s no pise
// lo que estás escribiendo.
function useAutosave(block, onUpdate) {
  const [local, setLocal] = useState(block);
  const timerRef = useRef(null);
  const pendingRef = useRef({});
  const dirtyRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (dirtyRef.current) return;   // no pisar lo que se está editando
    setLocal(block);
  }, [block]);

  const flush = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const fields = pendingRef.current;
    pendingRef.current = {};
    dirtyRef.current = false;
    if (Object.keys(fields).length > 0) onUpdateRef.current(fields);
  }, []);

  const queue = useCallback(fields => {
    setLocal(prev => ({ ...prev, ...fields }));
    pendingRef.current = { ...pendingRef.current, ...fields };
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 700);
  }, [flush]);

  useEffect(() => flush, [flush]);   // guardar al desmontar

  return { local, queue, flush };
}
