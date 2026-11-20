import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';
import { cn } from '../../lib/utils';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/properties?mode=buy', label: 'Buy', match: (s) => s.includes('mode=buy') },
  { to: '/properties?mode=rent', label: 'Rent', match: (s) => s.includes('mode=rent') },
  { to: '/vastu', label: 'Vastu' },
  { to: '/construction', label: 'Construction' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname, search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (l) => {
    if (l.match) return pathname === '/properties' && l.match(search);
    if (l.to === '/properties') return pathname.startsWith('/properties') && !search;
    if (l.end) return pathname === l.to;
    return pathname.startsWith(l.to);
  };

  return (
    <header className={cn('sticky top-0 z-50 border-b transition-all duration-300', scrolled ? 'border-line bg-page/85 backdrop-blur-xl' : 'border-transparent bg-page')}>
      <div className="container-page flex h-16 items-center justify-between gap-4 sm:h-[72px]">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className={cn('relative rounded-lg px-3.5 py-2 text-sm font-bold transition-colors', isActive(l) ? 'text-brand' : 'text-muted hover:text-ink')}
            >
              {l.label}
              <span className={cn('absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand transition-transform duration-300', isActive(l) ? 'scale-x-100' : 'scale-x-0')} />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <div className="relative hidden md:block">
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition hover:bg-sunken" aria-haspopup="menu" aria-expanded={menu}>
                <Avatar name={user.name} size="sm" />
                <span className="max-w-[110px] truncate text-sm font-bold">{user.name.split(' ')[0]}</span>
                <ChevronDown size={15} className={cn('text-muted transition-transform', menu && 'rotate-180')} />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="card absolute right-0 z-20 mt-2 w-56 animate-scale-in p-2" role="menu">
                    <div className="border-b border-line px-3 pb-2.5 pt-1.5">
                      <p className="truncate text-sm font-bold">{user.name}</p>
                      <p className="text-xs text-muted">{ROLES[user.role].label}</p>
                    </div>
                    <Link to={ROLES[user.role].home} className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-sunken">
                      <LayoutDashboard size={17} /> Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-sunken"
                    >
                      <LogOut size={17} /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </div>
          )}
          <button className="btn-icon md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={cn('grid overflow-hidden border-line bg-page transition-all duration-300 md:hidden', open ? 'grid-rows-[1fr] border-t' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            {LINKS.map((l) => (
              <Link key={l.label} to={l.to} className={cn('rounded-xl px-4 py-3 text-[15px] font-bold transition', isActive(l) ? 'bg-brand-soft text-brand-deep' : 'text-ink hover:bg-sunken')}>
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
              {user ? (
                <>
                  <Link to={ROLES[user.role].home} className="btn btn-primary">
                    <LayoutDashboard size={17} /> Go to dashboard
                  </Link>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                  >
                    <LogOut size={17} /> Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline">
                    Log in
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
