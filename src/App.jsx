/* Hallmark · macrostructure: Workbench · theme: Cobalt-tuned
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * App shell — login + nav header + tab routing
 */

import { useState } from 'react';
import { LogOut, ArrowUpRight } from 'lucide-react';
import { Button, Input, Card, ToastContainer } from './components/ui.jsx';
import { cn } from './lib/cn';
import RoadmapPage from './pages/Roadmap.jsx';
import TeamPage from './pages/Team.jsx';
import { listMembers } from './lib/api';

export default function App() {
  const [email, setEmail] = useState(() => localStorage.getItem('dfa:roadmap:email') || '');
  const [tab, setTab] = useState('roadmap');
  const [authError, setAuthError] = useState(null);
  const [authChecking, setAuthChecking] = useState(false);

  const handleLogin = async (newEmail) => {
    setAuthChecking(true);
    setAuthError(null);
    localStorage.setItem('dfa:roadmap:email', newEmail);
    try {
      await listMembers();
      setEmail(newEmail);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Error de conexión';
      setAuthError(msg);
      localStorage.removeItem('dfa:roadmap:email');
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dfa:roadmap:email');
    setEmail('');
  };

  if (!email) return <LoginScreen onLogin={handleLogin} error={authError} loading={authChecking} />;

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--color-paper)]/90 backdrop-blur-xl border-b border-[var(--color-border)] sticky top-0 z-20 relative shadow-[var(--shadow-sm)]">
        {/* Top accent strip — thin gradient line that gives the header presence */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-violet)] to-[var(--color-pink)] opacity-70" />
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
          {/* Brand left */}
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

            {/* Tabs — underline indicator, no pill */}
            <nav className="flex items-center gap-1 -mb-3.5">
              <TabLink active={tab === 'roadmap'} onClick={() => setTab('roadmap')}>Tablero</TabLink>
              <TabLink active={tab === 'team'} onClick={() => setTab('team')}>Equipo</TabLink>
            </nav>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Sesión</span>
              <span className="text-[12px] text-[var(--color-ink-2)]">{email}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] transition-colors duration-[var(--dur-fast)]"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
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

// ─── Login screen ───────────────────────────────────────────────────────────
// Editorial split: brand statement left, form right. Type-led, no centered card cliché.
function LoginScreen({ onLogin, error, loading }) {
  const [emailInput, setEmailInput] = useState('');

  return (
    <div className="min-h-screen grid md:grid-cols-[1.1fr_1fr]">
      {/* Left panel — brand statement */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-[var(--color-ink)] text-[var(--color-paper)]">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-[var(--color-paper)] text-[var(--color-ink)] flex items-center justify-center font-display font-bold text-[12px]">D</span>
          <span className="font-display text-[15px] font-semibold tracking-tighter">Demand Flow AI</span>
        </div>

        <div className="space-y-6 max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">Workspace interno</p>
          <h1 className="font-display text-[44px] leading-[1.05] tracking-tighter">
            El roadmap completo del lanzamiento, en un solo lugar.
          </h1>
          <p className="text-[14px] text-[var(--color-paper-3)] leading-relaxed max-w-sm">
            Vista Gantt, drill-down por fase, asignación y comentarios. Una herramienta para los cuatro fundadores —
            no para clientes.
          </p>
        </div>

        <div className="flex items-center gap-6 text-[11px] font-mono uppercase tracking-widest text-[var(--color-ink-4)]">
          <span>v0.1.0</span>
          <span>·</span>
          <span>Local-only</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-8 md:p-16 bg-[var(--color-paper)]">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-3)] mb-3">Acceso restringido</p>
          <h2 className="font-display text-[28px] leading-tight tracking-tighter mb-2">Entrar al workspace</h2>
          <p className="text-[13px] text-[var(--color-ink-2)] mb-8 leading-relaxed">
            Tu correo debe estar autorizado en el backend para acceder.
          </p>

          <form onSubmit={e => { e.preventDefault(); if (emailInput.trim()) onLogin(emailInput.trim().toLowerCase()); }}>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)] block mb-2">
              Correo del equipo
            </label>
            <Input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="tu@email.com"
              autoFocus
              className="h-11"
            />

            {error && (
              <div className="mt-3 p-3 border-l-2 border-[var(--color-rose)] bg-[var(--color-rose-soft)] text-[12px] text-[var(--color-ink)]">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full mt-5" disabled={loading || !emailInput.trim()}>
              {loading ? 'Verificando…' : (
                <>Entrar <ArrowUpRight className="w-3.5 h-3.5" /></>
              )}
            </Button>
          </form>

          <p className="mt-12 text-[11px] text-[var(--color-ink-3)] leading-relaxed">
            <span className="font-mono uppercase tracking-widest">Cómo funciona ·</span>{' '}
            Tu correo se valida contra la allowlist del backend
            (<code className="font-mono text-[10px] bg-[var(--color-paper-3)] px-1 py-0.5 rounded">INTERNAL_ADMIN_EMAILS</code>).
            Sin autenticación real — diseñado para correr en localhost del equipo.
          </p>
        </div>
      </div>
    </div>
  );
}
