import { useState } from 'react';
import { ToastContainer } from './components/ui.jsx';
import { cn } from './lib/cn';
import RoadmapPage from './pages/Roadmap.jsx';
import TeamPage from './pages/Team.jsx';
import BusinessPlanPage from './pages/BusinessPlan.jsx';
import MetricsPage from './pages/Metrics.jsx';
import PricingPage from './pages/Pricing.jsx';

export default function App() {
  const [tab, setTab] = useState('roadmap');

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--color-paper)]/90 backdrop-blur-xl border-b border-[var(--color-border)] sticky top-0 z-20 relative shadow-[var(--shadow-sm)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-violet)] to-[var(--color-pink)] opacity-70" />
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--color-ink)] to-[oklch(28%_0.04_265)] text-[var(--color-paper)] flex items-center justify-center font-display font-bold text-[12px] shadow-[var(--shadow-sm)]">D</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[15px] font-semibold tracking-tighter text-[var(--color-ink)]">Demand Flow AI</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Roadmap</span>
              </div>
            </div>

            <nav className="flex items-center gap-1 -mb-3.5">
              <TabLink active={tab === 'roadmap'} onClick={() => setTab('roadmap')}>Tablero</TabLink>
              <TabLink active={tab === 'plan'} onClick={() => setTab('plan')}>Plan</TabLink>
              <TabLink active={tab === 'team'} onClick={() => setTab('team')}>Equipo</TabLink>
              <TabLink active={tab === 'pricing'} onClick={() => setTab('pricing')}>Pricing</TabLink>
              <TabLink active={tab === 'metrics'} onClick={() => setTab('metrics')}>Métricas</TabLink>
            </nav>
          </div>

          <span className="text-xs text-[var(--color-ink-3)]">Acceso por enlace</span>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto">
        {tab === 'roadmap' && <RoadmapPage />}
        {tab === 'plan' && <BusinessPlanPage />}
        {tab === 'team' && <TeamPage />}
        {tab === 'pricing' && <PricingPage />}
        {tab === 'metrics' && <MetricsPage />}
      </main>

      <ToastContainer />
    </div>
  );
}

function TabLink({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-1 py-3.5 text-[13px] font-medium transition-colors duration-[var(--dur-fast)]',
        active ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
      )}
    >
      <span className="px-3">{children}</span>
      <span className={cn(
        'absolute left-3 right-3 -bottom-px h-px transition-all duration-[var(--dur-base)] ease-[var(--ease-out)]',
        active ? 'bg-[var(--color-ink)]' : 'bg-transparent',
      )} />
    </button>
  );
}
