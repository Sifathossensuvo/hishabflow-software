export function LogoMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0B7A57" />
      <path d="M20 16v32M44 16v32M20 32h24" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ light }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-xl font-bold ${light ? 'text-white' : 'text-ink'}`}>HisabFlow</span>
    </span>
  );
}
