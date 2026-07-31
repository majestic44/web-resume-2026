import { Chip } from '@heroui/react';
import { FilePenLine, FolderPlus, ImagePlus, LayoutDashboard, LogIn, PanelsTopLeft, Shapes, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard.jsx';
import { DocumentPage } from './pages/DocumentPage.jsx';
import { Editor } from './pages/Editor.jsx';
import { Login } from './pages/Login.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { Members } from './pages/Members.jsx';
import { PortfolioAdmin } from './pages/PortfolioAdmin.jsx';
import { ProfilePublic } from './pages/ProfilePublic.jsx';
import { ProfilesAdmin } from './pages/ProfilesAdmin.jsx';
import { Templates } from './pages/Templates.jsx';

const routes = {
  '/dashboard': Dashboard,
  '/login': Login,
  '/editor': Editor,
  '/portfolio': PortfolioAdmin,
  '/members': Members,
  '/profiles': ProfilesAdmin,
  '/templates': Templates
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/editor', label: 'Editor', icon: FilePenLine },
  { href: '/portfolio', label: 'Media', icon: ImagePlus },
  { href: '/profiles', label: 'Profiles', icon: FolderPlus },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/templates', label: 'Templates', icon: Shapes },
  { href: '/login', label: 'Sign In', icon: LogIn }
];

export function App() {
  const pathname = window.location.pathname;
  const [authState, setAuthState] = useState({ ready: false, dataSource: 'seed', user: null });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(response => response.json())
      .then(payload => {
        setAuthState({
          ready: true,
          dataSource: payload.dataSource || 'seed',
          user: payload.user || null
        });
      })
      .catch(() => {
        setAuthState({ ready: true, dataSource: 'seed', user: null });
      });
  }, []);

  const pageProps = {
    authState,
    refreshAuth: () =>
      fetch('/api/auth/me')
        .then(response => response.json())
        .then(payload => setAuthState({
          ready: true,
          dataSource: payload.dataSource || 'seed',
          user: payload.user || null
        }))
  };

  if (pathname.startsWith('/shared/resume/')) {
    return <DocumentPage pathname={pathname} shared />;
  }

  if (pathname === '/') {
    return <LandingPage {...pageProps} />;
  }

  if (!authState.ready) {
    return <div className="site-shell directory-shell"><main className="directory-page"><p className="muted">Loading secure workspace...</p></main></div>;
  }

  if (authState.dataSource === 'database' && !authState.user && pathname !== '/login') {
    return <Login {...pageProps} />;
  }

  if (pathname.startsWith('/profile/')) {
    return <ProfilePublic pathname={pathname} />;
  }

  if (pathname.startsWith('/resume/') || pathname.startsWith('/cover-letter/')) {
    return <DocumentPage pathname={pathname} />;
  }

  const Page = routes[pathname] || Dashboard;
  const visibleNavItems = navItems.filter(item => {
    if (item.href === '/login') return !authState.user;
    if (!['/members', '/profiles'].includes(item.href)) return true;
    return authState.dataSource === 'database' && ['owner', 'admin'].includes(authState.user?.role);
  });
  return (
    <div className="app-shell lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="sidebar flex flex-col gap-7 bg-slate-950 px-6 py-6 text-slate-50 lg:min-h-screen">
        <a className="brand-lockup flex items-center gap-3" href="/dashboard">
          <span className="brand-mark grid h-11 w-11 place-items-center rounded-lg border border-white/35 bg-teal-700"><PanelsTopLeft size={22} /></span>
          <span className="grid gap-0.5">
            <strong className="block">Household Resume</strong>
            <small className="block text-slate-300">Family CMS</small>
          </span>
        </a>
        <nav className="side-nav grid gap-1.5" aria-label="Dashboard">
          {visibleNavItems.map(item => {
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 transition',
                  pathname === item.href ? 'active bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'
                ].join(' ')}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="sidebar-note mt-auto rounded-lg border border-white/15 p-3.5">
          <span className="text-sm text-slate-300">{authState.dataSource === 'database' ? 'Auth Mode' : 'Seed Mode'}</span>
          <p className="mt-1 text-sm leading-6 text-slate-200">
            {authState.user
              ? `${authState.user.name} signed in as ${authState.user.role}.`
              : authState.dataSource === 'database'
                ? 'Sign in to unlock draft saving.'
                : 'Draft saving is open in seed mode.'}
          </p>
          {authState.user ? <Chip className="mt-3" variant="soft" color="primary">{authState.user.email}</Chip> : null}
        </div>
      </aside>

      <main className="app-main px-6 py-8 lg:px-10 lg:py-10">
        <Page {...pageProps} />
      </main>
    </div>
  );
}
