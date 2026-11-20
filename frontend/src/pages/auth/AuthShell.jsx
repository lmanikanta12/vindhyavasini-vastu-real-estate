import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../../components/layout/Logo';
import ThemeToggle from '../../components/layout/ThemeToggle';


export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#7A3418] p-12 text-[#F8F2E6] lg:flex lg:flex-col lg:justify-between">
        <div className="pattern-dots pointer-events-none absolute inset-0 opacity-30" />
        <Link to="/" className="relative inline-flex items-center gap-2.5 font-display text-xl font-semibold leading-tight">
          <img src="/logo.jpg" alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /> Vindhyavasini Vastu and Real Estate
        </Link>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight text-[#F8F2E6]">Welcome to Vindhyavasini Vastu and Real Estate</h2>
          <p className="mt-4 text-justify text-lg text-[#F8F2E6]/75">Property, construction and Vastu guidance, all in one place, made simple for your family, from search to move-in.</p>
        </div>
        <p className="relative text-xs text-[#F8F2E6]/60">Vastu guidance is consultancy advice, not a guarantee of outcomes.</p>
      </div>

      <div className="flex flex-col bg-page">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6">
          <Link to="/" className="group inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:border-brand hover:text-brand">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" /> Back to home
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-md animate-fade-up">
            <div className="mb-6 lg:hidden"><Logo /></div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
