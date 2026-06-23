// Mini clsx — concatena clases ignorando falsy.
export function cn(...args) {
  return args.filter(Boolean).join(' ');
}
