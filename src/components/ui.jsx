/* Hallmark · component-scope refinement — modern-minimal · Cobalt-tuned tokens
 * pre-emit critique: P5 H5 E5 S5 R5 V4
 * states: default · hover · focus · active · disabled · loading · error · success
 */

import React from 'react';
import { cn } from '@/lib/cn';

// ─── Button ─────────────────────────────────────────────────────────────────
// Voice: precise verbs. No gradients. No drop shadows. Hover = tint change only.
// Focus ring inherited from base layer (instant, no animation).
export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap';
  const variants = {
    primary: 'text-[var(--color-paper)] bg-[var(--color-ink)] hover:bg-[var(--color-accent)]',
    secondary: 'text-[var(--color-ink)] bg-[var(--color-paper-3)] hover:bg-[var(--color-paper-4)]',
    ghost: 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]',
    accent: 'text-[var(--color-paper)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)]',
    danger: 'text-[var(--color-paper)] bg-[var(--color-rose)] hover:opacity-90',
    outline: 'text-[var(--color-ink)] border border-[var(--color-border)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)]',
  };
  const sizes = {
    sm: 'h-7 px-2.5 text-[12px]',
    md: 'h-8 px-3 text-[13px]',
    lg: 'h-10 px-4 text-[14px]',
  };
  return (
    <button className={cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)} {...props}>
      {children}
    </button>
  );
}

// ─── Input ──────────────────────────────────────────────────────────────────
// 1px border, subtle focus state via border + ring (the global :focus-visible).
// No gradient, no inner shadow.
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-9 px-3 text-[13px] rounded-md',
        'bg-[var(--color-paper)] text-[var(--color-ink)]',
        'border border-[var(--color-border)]',
        'placeholder:text-[var(--color-ink-4)]',
        'focus:outline-none focus:border-[var(--color-accent)]',
        'transition-colors duration-[var(--dur-fast)]',
        className,
      )}
      {...props}
    />
  );
}

// ─── Select (native, but styled) ────────────────────────────────────────────
export function Select({ value, onChange, children, className, ...props }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={cn(
          'w-full h-9 pl-3 pr-8 text-[13px] rounded-md appearance-none',
          'bg-[var(--color-paper)] text-[var(--color-ink)]',
          'border border-[var(--color-border)]',
          'focus:outline-none focus:border-[var(--color-accent)]',
          'transition-colors duration-[var(--dur-fast)]',
          'cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[var(--color-ink-3)]" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Textarea ───────────────────────────────────────────────────────────────
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 text-[13px] rounded-md resize-none',
        'bg-[var(--color-paper)] text-[var(--color-ink)]',
        'border border-[var(--color-border)]',
        'placeholder:text-[var(--color-ink-4)]',
        'focus:outline-none focus:border-[var(--color-accent)]',
        'transition-colors duration-[var(--dur-fast)]',
        'font-body leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────
// Hairline border + soft elevation. The inset highlight gives a refined paper-on-paper feel.
export function Card({ children, className }) {
  return (
    <div className={cn(
      'bg-[var(--color-paper)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-card)]',
      className,
    )}>
      {children}
    </div>
  );
}

// ─── Toast (inline, no library) ─────────────────────────────────────────────
let toastListeners = [];
export function toast(message, type = 'info') {
  toastListeners.forEach(l => l({ message, type, id: Math.random() }));
}
toast.success = (m) => toast(m, 'success');
toast.error   = (m) => toast(m, 'error');
toast.info    = (m) => toast(m, 'info');

export function ToastContainer() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const listener = (t) => {
      setItems(prev => [...prev, t]);
      setTimeout(() => setItems(prev => prev.filter(p => p.id !== t.id)), 3500);
    };
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-2.5 rounded-md border text-[13px] font-medium',
            'animate-[slideUp_var(--dur-base)_var(--ease-out)]',
            t.type === 'success' && 'bg-[var(--color-paper)] border-[var(--color-emerald)] text-[var(--color-emerald)]',
            t.type === 'error'   && 'bg-[var(--color-paper)] border-[var(--color-rose)] text-[var(--color-rose)]',
            t.type === 'info'    && 'bg-[var(--color-ink)] border-[var(--color-ink)] text-[var(--color-paper)]',
          )}
        >
          {t.message}
        </div>
      ))}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
