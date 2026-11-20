import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ExternalLink, LogOut, Menu, X } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { NAV } from '../../config/navigation';
import { ROLES } from '../../lib/constants';
import useNotifications from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';

function SidebarContent({ role, user, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Logo to={ROLES[role].home} />
      </div>
      <p className="px-5 pb-2 pt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{ROLES[role].label}</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
        {NAV[role].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all duration-200',
                isActive ? 'bg-brand text-on-brand shadow-sm' : 'text-muted hover:bg-sunken hover:text-ink'
              )
            }
          >
            <item.icon size={19} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-line p-3">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-muted transition hover:bg-sunken hover:text-ink">
          <ExternalLink size={18} /> View website
        </Link>
        <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-muted transition hover:bg-sunken hover:text-ink">
          <LogOut size={18} /> Log out
        </button>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-sunken/70 p-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [bell, setBell] = useState(false);

  useEffect(() => {
    setDrawer(false);
    setBell(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const { items: notes, unread, markRead, markAllRead } = useNotifications(user?.id);
  const current = NAV[role].find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-page">

      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line bg-surface lg:block">
        <SidebarContent role={role} user={user} onLogout={handleLogout} />
      </aside>

      {drawer && (
        <div className="no-print fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-slide-in-left border-r border-line bg-surface shadow-lift">
            <button className="btn-icon absolute right-2 top-3" onClick={() => setDrawer(false)} aria-label="Close menu">
              <X size={20} />
            </button>
            <SidebarContent role={role} user={user} onNavigate={() => setDrawer(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-page/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button className="btn-icon lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <p className="truncate font-display text-lg font-semibold">{current?.label || 'Dashboard'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <div className="relative">
              <button className="btn-icon relative" onClick={() => setBell((b) => !b)} aria-label={`Notifications (${unread.length} unread)`}>
                <Bell size={20} />
                {unread.length > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-page bg-brand" />}
              </button>
              {bell && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBell(false)} />
                  <div className="card absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-scale-in overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <p className="font-display text-base font-semibold">Notifications</p>
                      {unread.length > 0 && (
                        <button className="text-xs font-bold text-brand hover:underline" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <ul className="max-h-80 overflow-y-auto">
                      {notes.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</li>}
                      {notes.map((n) => (
                        <li key={n.id}>
                          <Link
                            to={n.to || ROLES[role].home}
                            onClick={() => {
                              markRead(n.id);
                              setBell(false);
                            }}
                            className="flex gap-3 border-b border-line/60 px-4 py-3 transition last:border-0 hover:bg-sunken"
                          >
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-line' : 'bg-brand')} />
                            <span className="min-w-0">
                              <span className="block text-sm font-bold">{n.title}</span>
                              <span className="block text-[13px] text-muted">{n.text}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
            <Link to={`${ROLES[role].home}/profile`.replace('/admin/profile', '/admin/settings')} className="ml-1 hidden sm:block" aria-label="Profile">
              <Avatar name={user.name} size="sm" />
            </Link>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:py-8">
          <div key={pathname} className="page-enter mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
