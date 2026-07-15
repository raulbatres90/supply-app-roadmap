import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { ToastContainer } from './components/ui.jsx';
import { cn } from './lib/cn';
import RoadmapPage from './pages/Roadmap.jsx';
import TeamPage from './pages/Team.jsx';
import BusinessPlanPage from './pages/BusinessPlan.jsx';
import {
  clearSession,
  getStoredUser,
  getToken,
  listMembers,
  login,
  saveSession,
} from './lib/api';

export default function App() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('roadmap');
  const [session, setSession] = useState(() => (
    getToken() ? { user: getStoredUser(), checking: true } : null
  ));

  useEffect(() => {
    const expire = () => {
      queryClient.clear();
      setSession(null);
    };
    window.addEventListener('roadmap:unauthorized', expire);
    return () => window.removeEventListener('roadmap:unauthorized', expire);
  }, [queryClient]);

  useEffect(() => {
    if (!session?.checking) return;
    let active = true;
    listMembers()
      .then(() => active && setSession(current => ({ ...current, checking: false })))
      .catch(() => {
        if (!active) return;
        clearSession();
        queryClient.clear();
        setSession(null);
      });
    return () => { active = false; };
  }, [queryClient, session?.checking]);

  const handleLogout = () => {
    clearSession();
    queryClient.clear();
    setSession(null);
  };

  if (!session) {
    return <LoginScreen onAuthenticated={setSession} />;
  }
  if (session.checking) {
    return <div className="min-h-screen grid place-items-center text-sm text-[var(--color-ink-3)]">Validando acceso…</div>;
  }

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
            </nav>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--color-ink-3)]">
            <span className="hidden sm:inline">{session.user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto">
        {tab === 'roadmap' && <RoadmapPage />}
        {tab === 'plan' && <BusinessPlanPage />}
        {tab === 'team' && <TeamPage />}
      </main>

      <ToastContainer />
    </div>
  );
}

function LoginScreen({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const next = await login(email.trim(), password);
      saveSession(next);
      await listMembers();
      onAuthenticated(next);
    } catch (requestError) {
      clearSession();
      const status = requestError.response?.status;
      setError(status === 403
        ? 'Tu cuenta no tiene acceso al roadmap interno.'
        : requestError.response?.data?.error || 'No fue posible iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--color-paper-2)] px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-7 shadow-[var(--shadow-md)]">
        <div className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-3)]">Demand Flow AI</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-[var(--color-ink)]">Roadmap interno</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-3)]">Inicia sesión con una cuenta autorizada.</p>
        </div>

        <label className="block text-xs font-medium text-[var(--color-ink-2)]">
          Correo
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="mt-4 block text-xs font-medium text-[var(--color-ink-2)]">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? 'Validando…' : 'Iniciar sesión'}
        </button>
      </form>
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
