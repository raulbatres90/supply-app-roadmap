/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * App shell — sin login. Persona picker para identificar quién comenta.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, GanttChartSquare, Users, ChevronDown } from 'lucide-react';
import { Button, Card, ToastContainer } from './components/ui.jsx';
import { cn } from './lib/cn';
import RoadmapPage from './pages/Roadmap.jsx';
import TeamPage from './pages/Team.jsx';
import { listMembers } from './lib/api';

const ME_KEY = 'dfa:roadmap:me';

export default function App() {
  const [meId, setMeId] = useState(() => localStorage.getItem(ME_KEY) || '');
  const [tab, setTab] = useState('roadmap');
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['internal-members'],
    queryFn: listMembers,
  });

  // Sincroniza el email del miembro actual al localStorage para que el axios
  // interceptor lo mande en el header X-Internal-Admin-Email (audit, no gate).
  useEffect(() => {
    const me = members.find(m => m.id === meId);
    if (me?.email) localStorage.setItem('dfa:roadmap:email', me.email);
  }, [meId, members]);

  const handlePick = (memberId) => {
    setMeId(memberId);
    localStorage.setItem(ME_KEY, memberId);
    setPickerOpen(false);
  };

  // Si todavía no eligió persona, mostramos el picker. Si ya tenía elegido pero
  // ese miembro ya no existe (deleted), forzar re-pick.
  const me = members.find(m => m.id === meId);
  const needsPicker = !membersLoading && (!meId || !me);

  if (needsPicker) {
    return <PersonaPicker members={members} loading={membersLoading} onPick={handlePick} />;
  }

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--color-paper)]/90 backdrop-blur-xl border-b border-[var(--color-border)] sticky top-0 z-20 relative shadow-[var(--shadow-sm)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-violet)] to-[var(--color-pink)] opacity-70" />
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <span className="relative w-7 h-7 rounded-md bg-gradient-to-br from-[var(--color-ink)] to-[oklch(28%_0.04_265)] text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[12px] shadow-[var(--shadow-sm),0_0_0_1px_oklch(100%_0_0_/_0.08)_inset]">
                D
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-paper)]" />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[15px] font-semibold tracking-tighter text-[var(--color-ink)]">Demand Flow AI</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Roadmap</span>
              </div>
            </div>

            <nav className="flex items-center gap-1 -mb-3.5">
              <TabLink active={tab === 'roadmap'} onClick={() => setTab('roadmap')}>Tablero</TabLink>
              <TabLink active={tab === 'team'} onClick={() => setTab('team')}>Equipo</TabLink>
            </nav>
          </div>

          {/* Persona switcher — quién soy actualmente */}
          <div className="relative">
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--color-paper-3)] transition-colors"
              title="Cambiar persona"
            >
              <span
                className="w-6 h-6 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[10px]"
                style={{ background: me.color || 'var(--color-accent)' }}
              >
                {me.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden sm:block text-[12px] text-[var(--color-ink-2)]">
                Soy <strong className="text-[var(--color-ink)]">{me.display_name.split(' ')[0]}</strong>
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--color-ink-3)]" />
            </button>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
                <div className="absolute right-0 mt-1 w-56 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-card-hover)] py-1 z-40">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono font-semibold text-[var(--color-ink-3)] border-b border-[var(--color-border-2)] mb-1">
                    Cambiar persona
                  </div>
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handlePick(m.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                        m.id === meId ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-paper-2)]',
                      )}
                    >
                      <span
                        className="w-6 h-6 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[10px] flex-shrink-0"
                        style={{ background: m.color || 'var(--color-accent)' }}
                      >
                        {m.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <span className={cn('text-[12.5px] flex-1', m.id === meId ? 'font-semibold text-[var(--color-accent-text)]' : 'text-[var(--color-ink-2)]')}>
                        {m.display_name}
                      </span>
                      {m.id === meId && <span className="font-mono text-[10px] text-[var(--color-accent)]">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto">
        {tab === 'roadmap' ? <RoadmapPage /> : <TeamPage />}
      </main>

      <ToastContainer />
    </div>
  );
}

function TabLink({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-1 py-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-fast)]',
        active ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
      )}
    >
      <span className="px-3">{children}</span>
      <span
        className={cn(
          'absolute left-3 right-3 -bottom-px h-px transition-all duration-[var(--dur-base)] ease-[var(--ease-out)]',
          active ? 'bg-[var(--color-ink)]' : 'bg-transparent',
        )}
      />
    </button>
  );
}

// ─── Persona Picker ─────────────────────────────────────────────────────────
// Pantalla de bienvenida: 4 avatares grandes, click en el tuyo y entrás.
// No es login — solo te identificás para que tus comentarios queden firmados.
function PersonaPicker({ members, loading, onPick }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 mb-6">
            <span className="relative w-8 h-8 rounded-md bg-gradient-to-br from-[var(--color-ink)] to-[oklch(28%_0.04_265)] text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[14px] shadow-[var(--shadow-sm)]">
              D
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-paper)]" />
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tighter text-[var(--color-ink)]">Demand Flow AI</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Roadmap</span>
          </span>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-accent-text)] mb-3">Bienvenido</p>
          <h1 className="font-display text-[44px] leading-[1.05] tracking-tighter text-[var(--color-ink)] mb-3">
            ¿Quién sos?
          </h1>
          <p className="text-[14px] text-[var(--color-ink-2)] max-w-md mx-auto">
            Elegí tu avatar para que tus comentarios queden firmados. Podés cambiarlo en cualquier momento desde el header.
          </p>
        </div>

        {loading ? (
          <p className="text-center font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-4)]">Cargando equipo…</p>
        ) : members.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[13px] text-[var(--color-ink-2)]">No hay personas cargadas. Andá al backend y verifica que la tabla <code className="font-mono text-[11px] bg-[var(--color-paper-3)] px-1 rounded">internal_team_members</code> tenga datos.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => onPick(m.id)}
                className="group flex flex-col items-center gap-3 p-5 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-[var(--dur-base)] ease-[var(--ease-out)]"
              >
                <span
                  className="w-16 h-16 rounded-full text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[22px] group-hover:scale-105 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
                  style={{
                    background: m.color || 'var(--color-accent)',
                    boxShadow: `0 8px 24px ${m.color || 'var(--color-accent)'}40`,
                  }}
                >
                  {m.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="font-display text-[14px] font-semibold tracking-tighter text-[var(--color-ink)] text-center leading-tight">
                  {m.display_name}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="text-center mt-8 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-4)]">
          Sin contraseñas · sin emails · solo elegí quién sos
        </p>
      </div>
    </div>
  );
}
