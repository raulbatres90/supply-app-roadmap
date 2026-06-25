/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * App shell — sin login ni picker de entrada. Persona en el header (default = primero).
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ToastContainer } from './components/ui.jsx';
import { cn } from './lib/cn';
import RoadmapPage from './pages/Roadmap.jsx';
import TeamPage from './pages/Team.jsx';
import { listMembers } from './lib/api';

const ME_KEY = 'dfa:roadmap:me';

export default function App() {
  const [tab, setTab] = useState('roadmap');

  const { data: members = [] } = useQuery({
    queryKey: ['internal-members'],
    queryFn: listMembers,
  });

  // Auto-set silencioso: la app no muestra UI de identidad, pero seguimos sincronizando
  // un email "actual" al localStorage para que el axios interceptor lo mande en el header
  // (audit en backend: quién comentó / quién eliminó). Default = primer miembro.
  useEffect(() => {
    if (members.length === 0) return;
    const storedId = localStorage.getItem(ME_KEY);
    const me = members.find(m => m.id === storedId) || members[0];
    if (me) {
      localStorage.setItem(ME_KEY, me.id);
      localStorage.setItem('dfa:roadmap:email', me.email || '');
    }
  }, [members]);

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

          {/* Persona switcher removido del header — la app no necesita identificación visible.
              Si quisieras volver a poner el indicador "Soy [persona]", el state meId sigue activo. */}
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
