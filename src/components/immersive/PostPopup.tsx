'use client';

import { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, Repeat, ArrowUpRight, Loader2 } from 'lucide-react';

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
  const [thread, setThread] = useState<any>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const em = post.record?.embed || post.embed;
  const images = em?.images || [];
  const thumbUrl = images[0]?.fullsize || images[0]?.thumb || em?.thumbnail || em?.video?.thumbnail || null;
  const isVideo = (em?.$type || '').includes('video');
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 my-8">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden">
          {thumbUrl && (
            <div className="w-full bg-black/50 flex items-center justify-center max-h-[70vh] overflow-hidden">
              {isVideo ? (
                <video
                  src={em?.playlist || em?.video?.playlist}
                  poster={thumbUrl}
                  controls
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : (
                <img src={thumbUrl} alt="" className="w-full h-auto max-h-[70vh] object-contain" />
              )}
            </div>
          )}

          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#1a1a2e] overflow-hidden shrink-0 border border-white/10">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-bold">
                    {(displayName || '?')[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                <p className="text-white/40 text-xs truncate">@{handle}</p>
              </div>
              <span className="ml-auto text-white/30 text-xs">{relativeTime(post.record?.createdAt || post.indexedAt)}</span>
            </div>

            {caption && (
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
            )}

            <div className="flex items-center gap-6 text-white/50 text-sm">
              <span className="flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                {formatCount(post.likeCount || 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {formatCount(post.replyCount || 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <Repeat className="h-4 w-4" />
                {formatCount(post.repostCount || 0)}
              </span>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Comments</h3>
              {threadLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/20" />
                </div>
              ) : replies.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply: any, idx: number) => {
                    const rp = reply.post || reply;
                    const auth = rp.author || {};
                    return (
                      <div key={`${rp.uri || 'reply'}-${idx}`} className="flex gap-3 p-3 rounded-xl bg-white/5">
                        <div className="h-8 w-8 rounded-full bg-[#1a1a2e] overflow-hidden shrink-0 border border-white/5">
                          {auth.avatar ? (
                            <img src={auth.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-bold">
                              {(auth.displayName || auth.handle || '?')[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white/80 text-xs font-semibold truncate">{auth.displayName || auth.handle}</p>
                            <p className="text-white/30 text-xs">@{auth.handle}</p>
                            <span className="text-white/20 text-xs ml-auto">{relativeTime(rp.record?.createdAt || rp.indexedAt)}</span>
                          </div>
                          <p className="text-white/60 text-sm mt-1">{rp.record?.text || ''}</p>
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
    </div>
  );
}
