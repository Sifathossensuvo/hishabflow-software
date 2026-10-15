import { FiCheck } from 'react-icons/fi';
import Logo from './Logo.jsx';

const POINTS = [
  'Record a sale in a few taps, even for walk-in customers',
  'See exactly who owes you baki, and collect it',
  'Know which products are about to run out',
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 39px, #fff 39px 40px)' }} aria-hidden />
        <div className="relative"><Logo light /></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Your shop's hisab, without the khata book.</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[17px] text-brand-50">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15"><FiCheck className="h-3 w-3" /></span>{p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-100">Free for up to 100 products. No ads, no credit card.</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mb-7 mt-1.5 text-[15px] text-ink-mute">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
