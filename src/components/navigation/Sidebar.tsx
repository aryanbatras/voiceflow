'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';

import { useSpells } from '@/hooks/useSpells';
import { Avatar } from '@/components/ui/avatar';
import {
  Home,
  Search,
  Bell,
  LayoutGrid,
  Users,
  Zap,
  Bookmark,
  Settings,
  Play,
  List,
  Scan,
} from 'lucide-react';

interface NavEntry {
  label: string;
  path: string;
  icon: 'home' | 'search' | 'reels' | 'bell' | 'feeds' | 'groups' | 'spells' | 'bookmarks' | 'lists' | 'profile' | 'settings' | 'immersive';
  badge?: boolean;
  hideEffect?: string;
  guestHidden?: boolean;
}

const NAV_ENTRIES: NavEntry[] = [
  { label: 'Home', path: '/feed', icon: 'home' },
  { label: 'Search', path: '/search', icon: 'search', hideEffect: 'hide_search_nav' },
  { label: 'Immersive', path: '/immersive', icon: 'immersive' },
  { label: 'Reels', path: '/reels', icon: 'reels', guestHidden: true },
  { label: 'Notifications', path: '/notifications', icon: 'bell', badge: true, guestHidden: true },
  { label: 'Discover', path: '/discover', icon: 'feeds', hideEffect: 'hide_feeds_nav' },
  { label: 'Groups', path: '/groups', icon: 'groups', guestHidden: true },
  { label: 'Lists', path: '/lists', icon: 'lists', guestHidden: true },
  { label: 'Spells', path: '/spells', icon: 'spells', guestHidden: true },
  { label: 'Bookmarks', path: '/bookmarks', icon: 'bookmarks', guestHidden: true },
  { label: 'Profile', path: '/profile', icon: 'profile', hideEffect: 'hide_profile_nav', guestHidden: true },
  { label: 'Settings', path: '/settings', icon: 'settings', guestHidden: true },
];

function NavIcon({ icon, isActive }: { icon: string; isActive: boolean }) {
  const className = `h-6 w-6 ${isActive ? 'stroke-[2.5]' : ''}`;
  switch (icon) {
    case 'home': return <Home className={className} />;
    case 'search': return <Search className={className} />;
    case 'bell': return <Bell className={className} />;
    case 'feeds': return <LayoutGrid className={className} />;
    case 'reels': return <Play className={className} />;
    case 'groups': return <Users className={className} />;
    case 'lists': return <List className={className} />;
    case 'spells': return <Zap className={className} />;
    case 'bookmarks': return <BookmarksIcon />;
    case 'settings': return <Settings className={className} />;
    case 'immersive': return <Scan className={className} />;
    default: return <Home className={className} />;
  }
}

function BookmarksIcon() {
  return <Bookmark className="h-6 w-6" />;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const unread = (unreadData as any)?.count ?? 0;
  const spells = useSpells();

  if (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname?.startsWith('/oauth') || pathname?.startsWith('/immersive')) {
    return null;
  }

  const isGuest = !isAuthenticated;
  const profilePath = session?.handle ? `/profile/${session.handle}` : '/login';

  return (
    <aside className="app-sidebar hidden sm:flex flex-col gap-1">
      <div className="px-3 pt-4 pb-5">
        <h1 className="text-2xl font-bold font-heading tracking-tight" style={{ color: 'var(--brand)' }}>
          Rose
        </h1>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ENTRIES.map((entry) => {
          const itemKey = entry.icon;
          if (entry.hideEffect === 'hide_search_nav' && spells.hideSearchNav) return null;
          if (entry.hideEffect === 'hide_feeds_nav' && spells.hideFeedsNav) return null;
          if (entry.hideEffect === 'hide_profile_nav' && spells.hideProfileNav) return null;
          if (isGuest && entry.guestHidden) return null;

          const isActive = entry.path === '/profile'
            ? pathname?.startsWith('/profile')
            : pathname === entry.path || pathname?.startsWith(entry.path + '/') ||
              (entry.path === '/feed' && (pathname === '/feed' || pathname === '/')) ||
              (entry.path === '/groups' && pathname?.startsWith('/groups/'));

          if (entry.path === '/profile') {
            return (
              <button
                key={itemKey}
                onClick={() => router.push(profilePath)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-label="Profile"
              >
                <Avatar
                  src={session?.handle ? undefined : undefined}
                  alt={session?.handle || ''}
                  size="sm"
                  className={isActive ? 'ring-2 ring-[var(--brand)]' : ''}
                />
                <span>Profile</span>
              </button>
            );
          }

          return (
            <button
              key={itemKey}
              onClick={() => router.push(entry.path)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="relative">
                <NavIcon icon={entry.icon} isActive={isActive} />
                {entry.badge && unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              <span>{entry.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 pb-2 px-3">
        {isGuest ? (
          <button onClick={() => router.push('/login')} className="nav-compose">
            Sign in
          </button>
        ) : !spells.hideCompose ? (
          <button onClick={() => router.push('/compose')} className="nav-compose">
            Compose
          </button>
        ) : null}
      </div>
    </aside>
  );
}
