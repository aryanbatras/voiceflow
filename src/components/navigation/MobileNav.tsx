'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import {
  Home,
  Search,
  Plus,
  Bell,
  Menu,
  Play,
  Users,
  Bookmark,
  Settings,
  LayoutGrid,
  Zap,
  User,
  Scan,
} from 'lucide-react';
import { useSpells } from '@/hooks/useSpells';

const MENU_ITEMS = [
  { label: 'Notifications', path: '/notifications', icon: Bell, badge: true, guestHidden: true },
  { label: 'Immersive', path: '/immersive', icon: Scan },
  { label: 'Discover', path: '/discover', icon: LayoutGrid },
  { label: 'Groups', path: '/groups', icon: Users, guestHidden: true },
  { label: 'Spells', path: '/spells', icon: Zap, guestHidden: true },
  { label: 'Bookmarks', path: '/bookmarks', icon: Bookmark, guestHidden: true },
  { label: 'Settings', path: '/settings', icon: Settings, guestHidden: true },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const unread = (unreadData as any)?.count ?? 0;
  const spells = useSpells();
  const [menuOpen, setMenuOpen] = useState(false);

  const isGuest = !isAuthenticated;
  const profilePath = session?.handle ? `/profile/${session.handle}` : '/login';

  const navigate = useCallback((path: string) => {
    setMenuOpen(false);
    router.push(path);
  }, [router]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  if (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname?.startsWith('/oauth') || pathname === '/reels' || pathname === '/compose' || pathname?.startsWith('/immersive')) {
    return null;
  }

  const isHome = pathname === '/feed' || pathname === '/';
  const isSearch = pathname === '/search';
  const isReels = pathname === '/reels';

  const filteredMenuItems = MENU_ITEMS.filter((item) => {
    if (item.path === '/discover' && spells.hideFeedsNav) return false;
    if (isGuest && item.guestHidden) return false;
    return true;
  });

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface-base/95 backdrop-blur-lg safe-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {/* Home */}
          <button
            onClick={() => navigate('/feed')}
            className="flex flex-col items-center justify-center px-4 py-1"
            aria-label="Home"
          >
            <Home className={`h-6 w-6 ${isHome ? 'text-brand stroke-[2.5]' : 'text-muted-foreground'}`} />
          </button>

          {/* Search */}
          <button
            onClick={() => navigate('/search')}
            className="flex flex-col items-center justify-center px-4 py-1"
            aria-label="Search"
          >
            <Search className={`h-6 w-6 ${isSearch ? 'text-brand stroke-[2.5]' : 'text-muted-foreground'}`} />
          </button>

          {/* Compose / Sign in (center) */}
          {isGuest ? (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center -mt-4"
              aria-label="Sign in"
            >
              <div className="flex h-9 items-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-lg">
                Sign in
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('/compose')}
              className="flex items-center justify-center -mt-4"
              aria-label="Compose"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-black shadow-lg">
                <Plus className="h-6 w-6" />
              </div>
            </button>
          )}

          {/* Reels */}
          {!isGuest && (
            <button
              onClick={() => navigate('/reels')}
              className="flex flex-col items-center justify-center px-4 py-1"
              aria-label="Reels"
            >
              <Play className={`h-6 w-6 ${isReels ? 'text-brand stroke-[2.5]' : 'text-muted-foreground'}`} />
            </button>
          )}

          {/* Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center px-4 py-1"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>
      </nav>

      {/* Menu Drawer */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 bg-surface-base rounded-t-2xl shadow-2xl border-t border-border animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <button
              onClick={() => navigate(profilePath)}
              className="flex items-center gap-4 w-full px-6 py-3.5 hover:bg-accent/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{isGuest ? 'Sign in' : 'Profile'}</p>
                <p className="text-xs text-muted-foreground">@{session?.handle || 'login'}</p>
              </div>
            </button>

            <div className="border-t border-border/50 mx-4" />

            <div className="py-2">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-4 w-full px-6 py-3.5 hover:bg-accent/50 transition-colors ${isActive ? 'text-brand' : 'text-foreground'}`}
                  >
                    <span className="relative">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-brand' : 'text-muted-foreground'}`} />
                      {item.badge && unread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
}
