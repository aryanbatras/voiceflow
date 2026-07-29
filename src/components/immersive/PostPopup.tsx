'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Repeat, Loader2, ArrowLeft } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thread, setThread] = useState<any>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const em = post.record?.embed || post.embed;
  const thumbUrl = em?.video?.thumbnail || em?.thumbnail || em?.images?.[0]?.fullsize || em?.images?.[0]?.thumb || em?.external?.thumb || null;
  const isVideo = !!em?.video;
  const videoUrl = em?.video?.playlist || em?.video?.url;
  const caption = post.record?.text || '';
  const displayName = post.author?.displayName || post.author?.handle || '';
  const handle = post.author?.handle || '';
  const avatar = post.author?.avatar;

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

  const replies = thread?.replies?.filter((r: any) => r.post) || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        onClick={e => e.stopPropagation()}
        className="relative max-w-2xl w-[90vw] max-h-[90vh] overflow-y-auto bg-surface-elevated rounded-2xl shadow-2xl"
      >
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-end p-3 pointer-events-none">
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-black/20 text-white/70 hover:text-white hover:bg-black/40 transition-all backdrop-blur-md pointer-events-auto"
            aria-label="Close"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Media */}
        {isVideo ? (
          <div className="w-full bg-black/40 flex items-center justify-center">
            <video
              src={videoUrl}
              poster={thumbUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full max-h-[60vh] object-contain"
            />
          </div>
        ) : thumbUrl ? (
          <div className="w-full bg-black/40 flex items-center justify-center">
            <img src={thumbUrl} alt="" className="w-full max-h-[60vh] object-contain" />
          </div>
        ) : null}

        {/* Content */}
        <div className="px-5 py-5 space-y-4">
          {/* Author row */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold bg-muted">
                  {(displayName || '?')[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">{displayName}</p>
              <p className="text-muted-foreground text-xs truncate">@{handle} · {relativeTime(post.record?.createdAt || post.indexedAt)}</p>
            </div>
          </div>

          {/* Caption */}
          {caption && (
            <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
          )}

          {/* Interaction counts */}
          <div className="flex items-center gap-5 text-muted-foreground text-xs">
            <span className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              {formatCount(post.likeCount || 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatCount(post.replyCount || 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5" />
              {formatCount(post.repostCount || 0)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Comments */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Comments</p>
            {threadLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-muted-foreground/50 text-sm text-center py-4">None yet</p>
            ) : (
              <div className="space-y-2">
                {replies.map((reply: any, idx: number) => {
                  const rp = reply.post || reply;
                  const auth = rp.author || {};
                  return (
                    <div key={`${rp.uri || 'reply'}-${idx}`} className="flex gap-3 py-2">
                      <div className="h-7 w-7 rounded-full overflow-hidden shrink-0">
                        {auth.avatar ? (
                          <img src={auth.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-xs font-bold bg-muted">
                            {(auth.displayName || auth.handle || '?')[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground/80 text-xs font-semibold truncate">{auth.displayName || auth.handle}</p>
                          <p className="text-muted-foreground/50 text-xs">@{auth.handle}</p>
                          <span className="text-muted-foreground/30 text-xs ml-auto">{relativeTime(rp.record?.createdAt || rp.indexedAt)}</span>
                        </div>
                        <p className="text-foreground/60 text-sm mt-0.5">{rp.record?.text || ''}</p>
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
