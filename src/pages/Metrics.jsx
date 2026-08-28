/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * Métricas internas — versión simplificada. Sólo cuatro preguntas:
 *   1. Cuánto almacenamiento tiene cada proyecto y cada usuario.
 *   2. Cuánto gasta de IA cada proyecto (el único costo variable real por asiento).
 *   3. Cuánto ha sido el gasto total de IA (tokens y dinero).
 *   4. Cuánto pesa un archivo de N productos × M meses (en la base y como Excel).
 * Lee la instantánea diaria (no consulta en vivo) + el gasto de IA real.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Database, Sparkles, AlertTriangle } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import * as api from '@/lib/api';

const GB = 1e9;
const MB = b => Number(b || 0) / 1048576;
const fmtBytes = b => {
  const mb = MB(b);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1)    return `${mb.toFixed(1)} MB`;
  return `${(mb * 1024).toFixed(0)} kB`;
};
const fmtNum  = n => Number(n || 0).toLocaleString('es-MX');
const fmtDate = d => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—');
// Los montos de IA por proyecto son centavos: con 2 decimales se verían $0.00.
const fmtUsd = n => {
  const v = Number(n || 0);
  if (v === 0) return '$0';
  return v < 1 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
};

export default function MetricsPage() {
  const queryClient = useQueryClient();
  const [userFilter, setUserFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['internal-metrics'],
    queryFn: () => api.fetchMetrics(60),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const snapshotMut = useMutation({
    mutationFn: api.captureSnapshot,
    onSuccess: r => {
      toast.success(`Instantánea tomada · ${r.projects} proyectos`);
      queryClient.invalidateQueries({ queryKey: ['internal-metrics'] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'No se pudo tomar la instantánea'),
  });

  if (isLoading) {
    return <div className="px-6 py-24 text-center font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Cargando métricas…</div>;
  }

  if (error) {
    const unreachable = !error?.response;
    return (
      <div className="px-6 py-24 max-w-md mx-auto text-center">
        <AlertTriangle className="w-7 h-7 mx-auto text-[var(--color-amber)] mb-4" />
        <p className="text-[14px] text-[var(--color-ink)] mb-2">
          {unreachable ? 'No se pudo conectar con el servidor.' : 'No se pudieron cargar las métricas.'}
        </p>
        <p className="text-[12px] text-[var(--color-ink-3)] mb-5 leading-relaxed">
          {unreachable
            ? 'Revisá que el backend esté corriendo en el puerto 3001.'
            : (error?.response?.data?.error || error.message)}
        </p>
        <Button variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['internal-metrics'] })}>
          Reintentar
        </Button>
      </div>
    );
  }

  const g = data?.latest;
  if (!g) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="text-[14px] text-[var(--color-ink-2)] mb-4">Todavía no hay ninguna instantánea.</p>
        <Button onClick={() => snapshotMut.mutate()} disabled={snapshotMut.isPending}>
          {snapshotMut.isPending ? 'Midiendo…' : 'Tomar la primera'}
        </Button>
      </div>
    );
  }

  const allProjects = (data.projects || []).filter(p => p.skus > 0 || p.runs_total > 0 || p.ai_chats_real > 0);
  const users = (data.users || []).filter(u => u.projects > 0);
  const ai = data.ai || { has_real_data: false, usd: 0, total_tokens: 0, chats: 0, rate_input_per_1m: 0, rate_output_per_1m: 0 };

  // Filtro por usuario: acota los proyectos a los de esa persona.
  const selectedUser = users.find(u => u.email === userFilter) || null;
  const projects = selectedUser
    ? allProjects.filter(p => (selectedUser.project_ids || []).includes(p.project_id))
    : allProjects;

  const storagePct = (Number(g.db_size_bytes) / GB / 8) * 100;

  return (
    <div className="px-6 py-6 space-y-8 max-w-[1400px] mx-auto">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent-text)] mb-2">Infraestructura</p>
          <h1 className="font-display text-[32px] leading-tight tracking-tighter text-[var(--color-ink)]">Métricas internas</h1>
          <p className="text-[13px] text-[var(--color-ink-2)] mt-1">
            Instantánea del {fmtDate(g.captured_on)} · {projects.length} proyectos con datos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-2.5 text-[12px] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">Todos los usuarios</option>
            {users.map(u => (
              <option key={u.email} value={u.email}>{u.email} ({u.projects})</option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => snapshotMut.mutate()} disabled={snapshotMut.isPending}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', snapshotMut.isPending && 'animate-spin')} />
            {snapshotMut.isPending ? 'Midiendo…' : 'Actualizar ahora'}
          </Button>
        </div>
      </header>

      {/* ── KPIs ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={Database}
          label="Almacenamiento total"
          value={fmtBytes(g.db_size_bytes)}
          sub={`${storagePct.toFixed(1)}% del plan (8 GB)`}
        />
        <Kpi
          icon={Sparkles}
          label="Gasto de IA acumulado"
          value={ai.has_real_data ? fmtUsd(ai.usd) : '—'}
          sub={ai.has_real_data
            ? `${fmtNum(ai.total_tokens)} tokens · ${fmtNum(ai.chats)} chats`
            : 'sin chats registrados aún'}
        />
        <Kpi label="Proyectos con datos" value={fmtNum(projects.length)} />
        <Kpi label="Usuarios" value={fmtNum(users.length)} />
      </section>

      {/* ── Por proyecto ── */}
      <section>
        <SectionTitle num="1" title="Por proyecto" sub="Almacenamiento y gasto de IA de cada cliente" />
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-[var(--shadow-card)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-paper-2)]">
                <Th>Proyecto</Th>
                <Th right>SKUs</Th>
                <Th right>Almacenamiento</Th>
                <Th right>% del plan</Th>
                <Th right>Chats IA</Th>
                <Th right>Tokens IA</Th>
                <Th right>Gasto IA</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.project_id} className="border-b border-[var(--color-border-2)] last:border-0 hover:bg-[var(--color-paper-2)]/50">
                  <Td className="font-medium text-[var(--color-ink)]">
                    {p.project_name}
                    {p.members > 1 && (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-[var(--color-blue)] bg-[var(--color-blue-soft)] px-1.5 py-0.5 rounded">
                        compartido
                      </span>
                    )}
                  </Td>
                  <Td right mono>{fmtNum(p.skus)}</Td>
                  <Td right mono className="text-[var(--color-ink)]">{fmtBytes(p.bytes_total)}</Td>
                  <Td right mono dim
                      title="Porción del plan de Supabase que ocupa este cliente. El costo extra por cliente es $0 mientras no se supere el plan.">
                    {Number(p.pct_of_plan || 0).toFixed(1)}%
                  </Td>
                  <Td right mono dim>{p.ai_chats_real ? fmtNum(p.ai_chats_real) : '—'}</Td>
                  <Td right mono dim>{p.ai_tokens_real ? fmtNum(p.ai_tokens_real) : '—'}</Td>
                  <Td right mono className={cn('font-semibold', p.ai_usd_real > 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]')}>
                    {p.ai_tokens_real ? fmtUsd(p.ai_usd_real) : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[var(--color-ink-3)] mt-2 leading-relaxed">
          El almacenamiento va incluido en el plan (8 GB / 250 GB): el costo marginal por
          proyecto hoy es $0, por eso se muestra como % del plan. El único costo variable
          real por proyecto es la IA.
        </p>
      </section>

      {/* ── Por usuario ── */}
      <section>
        <SectionTitle num="2" title="Por usuario" sub="Clic en una fila para filtrar el tablero por esa persona" />
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-[var(--shadow-card)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-paper-2)]">
                <Th>Usuario</Th>
                <Th right>Proyectos</Th>
                <Th right>Almacenamiento</Th>
                <Th right>Chats IA</Th>
                <Th right>Tokens IA</Th>
                <Th right>Gasto IA</Th>
                <Th right>Últ. actividad</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const active = userFilter === u.email;
                return (
                  <tr
                    key={u.email}
                    onClick={() => setUserFilter(active ? '' : u.email)}
                    className={cn(
                      'border-b border-[var(--color-border-2)] last:border-0 cursor-pointer',
                      active ? 'bg-[var(--color-accent-tint)]/50' : 'hover:bg-[var(--color-paper-2)]/50',
                    )}
                  >
                    <Td className="font-medium text-[var(--color-ink)]">{u.email}</Td>
                    <Td right mono>{fmtNum(u.projects)}</Td>
                    <Td right mono className="text-[var(--color-ink)]">{fmtBytes(u.bytes_total)}</Td>
                    <Td right mono dim>{u.ai_chats_real ? fmtNum(u.ai_chats_real) : '—'}</Td>
                    <Td right mono dim>{u.ai_tokens_real ? fmtNum(u.ai_tokens_real) : '—'}</Td>
                    <Td right mono className={cn('font-semibold', u.ai_usd_real > 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]')}>
                      {u.ai_tokens_real ? fmtUsd(u.ai_usd_real) : '—'}
                    </Td>
                    <Td right mono dim>
                      {u.last_activity_at && new Date(u.last_activity_at).getFullYear() > 1970
                        ? fmtDate(u.last_activity_at) : 'sin uso'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[var(--color-ink-3)] mt-2 leading-relaxed">
          El almacenamiento se atribuye por los proyectos de los que la persona es miembro:
          un proyecto compartido cuenta completo para cada uno.
        </p>
      </section>

      {/* ── Peso de un archivo ── */}
      <section>
        <SectionTitle num="3" title="Peso de un archivo" sub="Cuánto ocupa un archivo de N productos × M meses" />
        <FileWeightCalc rowBytes={data.row_bytes} />
      </section>

      {/* ── Cómo se calcula el gasto de IA ── */}
      {ai.rate_input_per_1m > 0 && (
        <p className="text-[11px] text-[var(--color-ink-3)] leading-relaxed">
          Gasto de IA = tokens reales de DeepSeek por chat, valuados a
          {' '}${ai.rate_input_per_1m}/M de entrada y ${ai.rate_output_per_1m}/M de salida.
          {!ai.has_real_data && ' Se empieza a acumular en cuanto el copiloto reciba su primer chat con el código nuevo desplegado.'}
        </p>
      )}
    </div>
  );
}

// ── Calculadora de peso ──────────────────────────────────────────────────────
// Traduce "N productos × M meses" a lo que pesa: (a) ya cargado en la base, con
// los bytes/fila reales medidos en producción, y (b) el Excel crudo que sube el
// usuario (estimado: el .xlsx real comprime y pesa menos).
const EXCEL_BYTES_PER_CELL = 9; // celda promedio en texto plano, sin comprimir
function FileWeightCalc({ rowBytes }) {
  const [rows, setRows] = useState(300); // productos (filas del Excel)
  const [cols, setCols] = useState(28);  // meses de historia (columnas)

  const histB = Number(rowBytes?.historical || 262); // bytes por fila en historical_data
  const skuB  = Number(rowBytes?.sku || 1441);        // bytes por ficha de producto

  const out = useMemo(() => {
    const r = Math.max(0, Number(rows) || 0);
    const c = Math.max(0, Number(cols) || 0);
    const cells   = r * c;                    // registros producto×mes
    const dbBytes = cells * histB + r * skuB; // historial + ficha de cada producto
    const xlsxBytes = cells * EXCEL_BYTES_PER_CELL;
    return { cells, dbBytes, xlsxBytes };
  }, [rows, cols, histB, skuB]);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-end gap-5">
        <Field label="Productos (filas)" value={rows} onChange={setRows} />
        <span className="pb-2 text-[var(--color-ink-3)] text-[16px]">×</span>
        <Field label="Meses de historia (columnas)" value={cols} onChange={setCols} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <Result
          label="Registros en la base"
          value={fmtNum(out.cells)}
          sub="una fila por producto × mes"
        />
        <Result
          label="Peso ya cargado"
          value={fmtBytes(out.dbBytes)}
          sub="historial + ficha de cada producto (bytes/fila reales)"
          strong
        />
        <Result
          label="Peso del Excel (aprox.)"
          value={fmtBytes(out.xlsxBytes)}
          sub="sin comprimir; el .xlsx real pesa menos"
          dim
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9.5px] uppercase tracking-widest text-[var(--color-ink-3)]">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-paper-2)] px-3 font-mono text-[14px] tabular text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
      />
    </label>
  );
}

function Result({ label, value, sub, strong, dim }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-2)] bg-[var(--color-paper-2)] px-4 py-3">
      <p className="font-mono text-[9.5px] uppercase tracking-widest text-[var(--color-ink-3)] mb-1.5">{label}</p>
      <p className={cn(
        'font-mono tabular text-[22px] leading-none',
        dim ? 'text-[var(--color-ink-2)]' : strong ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]',
      )}>{value}</p>
      <p className="text-[11px] text-[var(--color-ink-3)] mt-1.5 leading-snug">{sub}</p>
    </div>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────
function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3.5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--color-ink-3)]" />}
        <p className="font-mono text-[9.5px] uppercase tracking-widest text-[var(--color-ink-3)]">{label}</p>
      </div>
      <p className="font-display text-[26px] leading-none tracking-tight text-[var(--color-ink)]">{value}</p>
      {sub && <p className="text-[11px] text-[var(--color-ink-3)] mt-1.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ num, title, sub }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="font-mono text-[11px] font-semibold text-[var(--color-accent)]">{num}</span>
      <h2 className="font-display text-[18px] font-semibold tracking-tighter text-[var(--color-ink)]">{title}</h2>
      <span className="text-[12px] text-[var(--color-ink-3)]">{sub}</span>
    </div>
  );
}

function Th({ children, right }) {
  return (
    <th className={cn(
      'px-3 py-2.5 font-mono text-[9.5px] uppercase tracking-widest text-[var(--color-ink-3)] font-semibold whitespace-nowrap',
      right ? 'text-right' : 'text-left',
    )}>{children}</th>
  );
}

function Td({ children, right, mono, dim, className, title }) {
  return (
    <td title={title} className={cn(
      'px-3 py-2.5 whitespace-nowrap',
      right && 'text-right',
      mono && 'font-mono tabular',
      dim ? 'text-[var(--color-ink-3)]' : 'text-[var(--color-ink-2)]',
      className,
    )}>{children}</td>
  );
}
