/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * App shell — sin login ni picker de entrada. Persona en el header (default = primero).
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { ToastContainer } from './components/ui.jsx';
import { cn } from './lib/cn';
import RoadmapPage from './pages/Roadmap.jsx';
import TeamPage from './pages/Team.jsx';
import { listMembers } from './lib/api';

const ME_KEY = 'dfa:roadmap:me';

export default function App() {
  const [meId, setMeIdState] = useState(() => localStorage.getItem(ME_KEY) || '');
  const [tab, setTab] = useState('roadmap');
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['internal-members'],
    queryFn: listMembers,
  });

  // Auto-set: si todavía no eligió persona, default al primero del equipo.
  // Si el miembro guardado ya no existe (deleted), también re-defaultear.
  useEffect(() => {
    if (members.length === 0) return;
    const exists = members.find(m => m.id === meId);
    if (!exists) {
      setMeIdState(members[0].id);
      localStorage.setItem(ME_KEY, members[0].id);
    }
  }, [members, meId]);

  // Sincroniza el email del miembro actual al localStorage para que el axios
  // interceptor lo mande en el header (audit informativo, no gate).
  useEffect(() => {
    const me = members.find(m => m.id === meId);
    if (me?.email) localStorage.setItem('dfa:roadmap:email', me.email);
  }, [meId, members]);

  const setMeId = (id) => {
    setMeIdState(id);
    localStorage.setItem(ME_KEY, id);
    setPickerOpen(false);
  };

  const me = members.find(m => m.id === meId);

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

          {/* Persona switcher — solo visible cuando hay miembros cargados.
              No bloquea entrar a la app, solo indica quién está comentando. */}
          {me && (
            <div className="relative">
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--color-paper-3)] transition-colors"
                title="Cambiar quién soy (para firmar comentarios)"
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
                        onClick={() => setMeId(m.id)}
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
          )}
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
