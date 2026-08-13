/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * Team surface — member CRUD + edit modal
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, User as UserIcon } from 'lucide-react';
import { Button, Input, Card, toast } from '@/components/ui';
import { cn } from '@/lib/cn';
import * as api from '@/lib/api';

const PRESET_COLORS = [
  'oklch(48% 0.18 264)',  // cobalt
  'oklch(55% 0.14 158)',  // emerald
  'oklch(70% 0.16 65)',   // amber
  'oklch(58% 0.18 18)',   // rose
  'oklch(55% 0.16 195)',  // cyan
  'oklch(60% 0.18 130)',  // green
  'oklch(50% 0.22 295)',  // purple
  'oklch(55% 0.20 340)',  // pink
];

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['internal-members'],
    queryFn: api.listMembers,
  });

  const upsertMutation = useMutation({
    mutationFn: api.upsertMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-members'] });
      queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
      setEditing(null);
      toast.success('Miembro guardado');
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-members'] });
      queryClient.invalidateQueries({ queryKey: ['internal-tasks'] });
      toast.success('Miembro eliminado');
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Error al eliminar'),
  });

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Section head — typographic */}
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-3)] mb-2">Configuración</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[32px] leading-tight tracking-tighter text-[var(--color-ink)]">Equipo</h1>
            <p className="text-[13px] text-[var(--color-ink-2)] mt-1 max-w-xl">
              Personas que pueden ser asignadas a tareas del roadmap. Se identifican por nombre.
            </p>
          </div>
          <Button variant="accent" size="md" onClick={() => setEditing({ display_name: '', color: PRESET_COLORS[0] })}>
            <Plus className="w-3.5 h-3.5" /> Agregar persona
          </Button>
        </div>
      </header>

      {/* Members table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Cargando equipo…</div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)] mb-4">Sin personas todavía</p>
            <Button variant="outline" size="sm" onClick={() => setEditing({ display_name: '', color: PRESET_COLORS[0] })}>
              <Plus className="w-3.5 h-3.5" /> Agregar la primera
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[var(--color-paper-2)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium text-[var(--color-ink-3)]">Persona</th>
                <th className="text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium text-[var(--color-ink-3)] w-20">Color</th>
                <th className="text-right px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest font-medium text-[var(--color-ink-3)] w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-[var(--color-border-2)] last:border-b-0 hover:bg-[var(--color-paper-2)] transition-colors duration-[var(--dur-fast)]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-semibold text-[12px] flex-shrink-0"
                        style={{ background: m.color }}
                      >
                        {m.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium text-[13px] text-[var(--color-ink)]">{m.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block w-4 h-4 rounded-sm border border-[var(--color-border)]" style={{ background: m.color }} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Editar</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm(`¿Eliminar a ${m.display_name}? Sus tareas quedarán sin asignar.`)) deleteMutation.mutate(m.id); }}
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[var(--color-rose)]" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <MemberEditModal
          member={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => upsertMutation.mutate(data)}
          saving={upsertMutation.isPending}
        />
      )}
    </div>
  );
}

function MemberEditModal({ member, onClose, onSave, saving }) {
  const [local, setLocal] = useState(member);
  const isNew = !member.id;

  return (
    <div
      className="fixed inset-0 z-40 bg-[var(--color-ink)]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">
              {isNew ? 'Nueva persona' : 'Editar persona'}
            </p>
            <h2 className="font-display text-[18px] font-semibold tracking-tighter text-[var(--color-ink)] mt-0.5">
              {isNew ? 'Agregar al equipo' : local.display_name || 'Sin nombre'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={e => { e.preventDefault(); onSave(local); }} className="px-5 py-5 space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest font-medium text-[var(--color-ink-3)] flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" /> Nombre
            </label>
            <Input
              value={local.display_name}
              onChange={e => setLocal({ ...local, display_name: e.target.value })}
              placeholder="Nombre Apellido"
              required
              className="mt-1.5 h-10"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest font-medium text-[var(--color-ink-3)] block mb-2">
              Color de avatar
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLocal({ ...local, color: c })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none',
                    local.color === c ? 'ring-2 ring-offset-2 ring-[var(--color-ink)] scale-110' : 'hover:scale-105',
                  )}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {local.display_name && (
            <div className="flex items-center gap-3 p-3 bg-[var(--color-paper-2)] border border-[var(--color-border-2)] rounded-md">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Preview</span>
              <span className="text-[var(--color-ink-4)]">·</span>
              <div className="flex items-center gap-2.5">
                <span
                  className="w-9 h-9 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-semibold text-[13px]"
                  style={{ background: local.color }}
                >
                  {local.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <div className="leading-tight">
                  <p className="font-medium text-[13px] text-[var(--color-ink)]">{local.display_name}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border-2)]">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving || !local.display_name}>
              {saving ? 'Guardando…' : (isNew ? 'Agregar persona' : 'Guardar cambios')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
