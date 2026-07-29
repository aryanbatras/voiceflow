'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Repeat, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PostPopupProps {
  post: any;
  onClose: () => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PostPopup({ post, onClose }: PostPopupProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [thread, setThread] = useState<any>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Interaction state
  const [liked, setLiked] = useState(!!post.viewer?.like);
  const [likeUri, setLikeUri] = useState<string | null>(post.viewer?.like || null);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [reposted, setReposted] = useState(!!post.viewer?.repost);
  const [repostUri, setRepostUri] = useState<string | null>(post.viewer?.repost || null);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const likingRef = useRef(false);
  const repostingRef = useRef(false);

  // Animated close — defined BEFORE requireAuth since requireAuth calls it
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }, [onClose]);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      handleClose();
      router.push('/login');
      return false;
    }
    return true;
  }, [isAuthenticated, router, handleClose]);

  const em = post.record?.embed || post.embed;
  const thumbUrl = em?.video?.thumbnail || em?.thumbnail || em?.images?.[0]?.fullsize || em?.images?.[0]?.thumb || em?.external?.thumb || null;
  const isVideo = !!em?.video;
  const videoUrl = em?.video?.playlist || em?.video?.url;
  const caption = post.record?.text || '';
  const displayName = post.author?.displayName || post.author?.handle || '';
  const handle = post.author?.handle || '';
  const avatar = post.author?.avatar;

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlayRef.current) {
        overlayRef.current.style.opacity = '1';
      }
    });
  }, []);

  useEffect(() => {
    if (!post.uri) return;
    setThreadLoading(true);
    fetch(`/api/public/thread?uri=${encodeURIComponent(post.uri)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.thread?.post) {
          setThread(data.thread);
        } else if (data?.post) {
          setThread(data);
        }
      })
      .catch(() => {})
      .finally(() => setThreadLoading(false));
  }, [post.uri]);

  const handleLike = useCallback(async () => {
    if (!requireAuth()) return;
    if (likingRef.current) return;
    likingRef.current = true;

    if (liked && likeUri) {
      try {
        const res = await fetch('/api/interact/unlike', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ likeUri }),
        });
        if (res.ok) {
          setLiked(false);
          setLikeUri(null);
          setLikeCount((prev: number) => Math.max(0, prev - 1));
        }
      } catch {}
    } else {
      try {
        const res = await fetch('/api/interact/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri: post.uri, cid: post.cid }),
        });
        if (res.ok) {
          const data = await res.json();
          setLiked(true);
          setLikeUri(data.uri);
          setLikeCount((prev: number) => prev + 1);
        }
      } catch {}
    }
    likingRef.current = false;
  }, [liked, likeUri, post.uri, post.cid, requireAuth]);

  const handleRepost = useCallback(async () => {
    if (!requireAuth()) return;
    if (repostingRef.current) return;
    repostingRef.current = true;

    if (reposted && repostUri) {
      try {
        const res = await fetch('/api/interact/repost', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repostUri }),
        });
        if (res.ok) {
          setReposted(false);
          setRepostUri(null);
          setRepostCount((prev: number) => Math.max(0, prev - 1));
        }
      } catch {}
    } else {
      try {
        const res = await fetch('/api/interact/repost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uri: post.uri, cid: post.cid }),
        });
        if (res.ok) {
          const data = await res.json();
          setReposted(true);
          setRepostUri(data.uri);
          setRepostCount((prev: number) => prev + 1);
        }
      } catch {}
    }
    repostingRef.current = false;
  }, [reposted, repostUri, post.uri, post.cid, requireAuth]);

  const handleProfileClick = useCallback(() => {
    if (!handle) return;
    handleClose();
    router.push(`/profile/${encodeURIComponent(handle)}`);
  }, [handle, router, handleClose]);

  const handleReplyClick = useCallback(() => {
    if (!requireAuth()) return;
    // Navigate to the full thread page
    handleClose();
    router.push(`/feed/${encodeURIComponent(post.uri || '')}`);
  }, [post.uri, router, handleClose, requireAuth]);

  const replies = thread?.replies?.filter((r: any) => r.post) || [];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl transition-all duration-300 ease-out"
      style={{ opacity: 0 }}
      onClick={handleClose}
    >
      <div
        ref={scrollRef}
        onClick={e => e.stopPropagation()}
        className={`
          relative max-w-2xl w-[90vw] max-h-[85vh] overflow-y-auto
          [&::-webkit-scrollbar]:hidden
          bg-white/5 backdrop-blur-2xl
          rounded-2xl shadow-2xl
          transition-all duration-250 ease-out
          ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-end p-3 pointer-events-none">
          <button
            onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-white/20 transition-all backdrop-blur-md pointer-events-auto"
            aria-label="Close"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Media */}
        {isVideo ? (
          <div className="w-full bg-black/60 flex items-center justify-center rounded-t-2xl overflow-hidden">
            <video
              src={videoUrl}
              poster={thumbUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full max-h-[55vh] object-contain"
            />
          </div>
        ) : thumbUrl ? (
          <div className="w-full bg-black/60 flex items-center justify-center rounded-t-2xl overflow-hidden">
            <img
              src={thumbUrl}
              alt=""
              className="w-full max-h-[55vh] object-contain"
              draggable={false}
            />
          </div>
        ) : null}

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          {/* Author row — clickable to profile */}
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 w-full text-left group"
          >
            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 ring-2 ring-white/10 group-hover:ring-white/30 transition-all">
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-sm font-bold bg-white/10">
                  {(displayName || '?')[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate group-hover:text-white/80 transition-colors">{displayName}</p>
              <p className="text-white/50 text-xs truncate">@{handle} · {relativeTime(post.record?.createdAt || post.indexedAt)}</p>
            </div>
          </button>

          {/* Caption */}
          {caption && (
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
          )}

          {/* Interaction buttons — now functional */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleLike}
              disabled={likingRef.current}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                liked
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              } active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  liked ? 'fill-red-400 scale-110' : ''
                }`}
              />
              {formatCount(likeCount)}
            </button>

            <button
              onClick={handleRepost}
              disabled={repostingRef.current}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                reposted
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              } active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={reposted ? 'Undo repost' : 'Repost'}
            >
              <Repeat className={`h-3.5 w-3.5 transition-transform duration-200 ${reposted ? 'scale-110' : ''}`} />
              {formatCount(repostCount)}
            </button>

            <button
              onClick={handleReplyClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-90"
              aria-label="Reply"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {formatCount(post.replyCount || 0)}
            </button>
          </div>

          {/* Spacer */}
          <div className="h-px bg-white/5" />

          {/* Comments */}
          <div className="space-y-3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Comments</p>
            {threadLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">None yet</p>
            ) : (
              <div className="space-y-2">
                {replies.map((reply: any, idx: number) => {
                  const rp = reply.post || reply;
                  const auth = rp.author || {};
                  return (
                    <div key={`${rp.uri || 'reply'}-${idx}`} className="flex gap-3 py-2 group hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
                        {auth.avatar ? (
                          <img src={auth.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold bg-white/10">
                            {(auth.displayName || auth.handle || '?')[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white/80 text-xs font-semibold truncate">{auth.displayName || auth.handle}</p>
                          <p className="text-white/40 text-xs">@{auth.handle}</p>
                          <span className="text-white/20 text-xs ml-auto">{relativeTime(rp.record?.createdAt || rp.indexedAt)}</span>
                        </div>
                        <p className="text-white/60 text-sm mt-0.5">{rp.record?.text || ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
