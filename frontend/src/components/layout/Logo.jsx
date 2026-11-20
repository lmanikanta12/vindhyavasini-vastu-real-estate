import { Link } from 'react-router-dom';
import { BRAND } from '../../lib/constants';

export default function Logo({ to = '/', compact = false, className = '' }) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2.5 ${className}`} aria-label={`${BRAND} home`}>
      <img src="/logo.jpg" alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-brand/30 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      {!compact && <span className="font-display text-base font-semibold leading-tight text-brand-deep sm:text-lg">{BRAND}</span>}
    </Link>
  );
}
