'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function TrendsSidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (pathname === '/login' || pathname === '/' || pathname?.startsWith('/oauth') || pathname?.startsWith('/immersive')) {
    return null;
  }

  return (
    <aside className="app-trends">
      <div className="sticky top-0 pt-3 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-full bg-surface-elevated py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand border-none"
          />
        </div>

        {/* Suggested users */}
        {session && (
          <div className="trend-card">
            <h2 className="text-lg font-bold text-foreground mb-3">Quick Links</h2>
            <div className="space-y-2 text-sm">
              <a href="/discover" className="block text-muted-foreground hover:text-foreground transition-colors">Discover people</a>
              <a href="/search" className="block text-muted-foreground hover:text-foreground transition-colors">Search</a>
              <a href="/settings" className="block text-muted-foreground hover:text-foreground transition-colors">Settings</a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-2 text-xs text-muted-foreground space-y-1">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">About</a>
          </div>
          <p>Rose · AT Protocol</p>
        </div>
      </div>
    </aside>
  );
}
