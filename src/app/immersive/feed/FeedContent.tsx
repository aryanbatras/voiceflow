'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Masonry from '@/components/immersive/Masonry';
import PostPopup from '@/components/immersive/PostPopup';

interface MasonryItem {
  id: string;
  img: string;
  url: string;
  height: number;
}

function extractImageUrl(post: any): { url: string; aspectRatio?: { width: number; height: number } } | null {
  const em = post.record?.embed || post.embed;
  if (!em) return null;

  if (em.images && em.images.length > 0) {
    const img = em.images[0];
    return {
      url: img.fullsize || img.thumb,
      aspectRatio: img.aspectRatio,
    };
  }

  if (em.external?.thumb) return { url: em.external.thumb };
  if (em.thumbnail) return { url: em.thumbnail };
  if (em.video?.thumbnail) return { url: em.video.thumbnail };

  return null;
}

function calculateHeight(aspectRatio?: { width: number; height: number }): number {
  if (!aspectRatio || !aspectRatio.height || !aspectRatio.width) {
    return 450;
  }
  const baseWidth = 300;
  return Math.round((baseWidth * aspectRatio.height) / aspectRatio.width);
}

export default function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const feedUri = searchParams.get('uri') || '';
  const feedLabel = searchParams.get('label') || 'Feed';

  const [items, setItems] = useState<MasonryItem[]>([]);
  const [rawPosts, setRawPosts] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const [selectedPost, setSelectedPost] = useState<any>(null);

  const loadFeed = useCallback(async (cursor?: string) => {
    if (!feedUri) return { items: [], cursor: null };
    const endpoint = isAuthenticated ? '/api/feed' : '/api/public/feed';
    const params = new URLSearchParams();
    if (isAuthenticated) {
      params.set('sourceType', 'custom');
      params.set('feedUri', feedUri);
    } else {
      params.set('feedUri', feedUri);
    }
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '30');

    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) return { items: [], cursor: null };
    return res.json();
  }, [feedUri, isAuthenticated]);

  useEffect(() => {
    if (!feedUri) {
      setLoading(false);
      return;
    }

    setLoading(true);
    cursorRef.current = null;

    loadFeed()
      .then(data => {
        const posts = data.items || [];
        const postMap = new Map<string, any>();
        const masonryItems: MasonryItem[] = [];

        posts.forEach((post: any, idx: number) => {
          const imgData = extractImageUrl(post);
          if (!imgData) return;
          const id = post.uri || `post-${idx}`;
          postMap.set(id, post);
          masonryItems.push({
            id,
            img: imgData.url,
            url: post.uri ? `/feed/${encodeURIComponent(post.uri)}` : '',
            height: calculateHeight(imgData.aspectRatio),
          });
        });

        setRawPosts(prev => {
          const merged = new Map(prev);
          postMap.forEach((v, k) => merged.set(k, v));
          return merged;
        });
        setItems(masonryItems);
        cursorRef.current = data.cursor || null;
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [feedUri, loadFeed]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !cursorRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);

    try {
      const data = await loadFeed(cursorRef.current);
      const posts = data.items || [];
      const postMap = new Map<string, any>();
      const newItems: MasonryItem[] = [];

      posts.forEach((post: any) => {
        const imgData = extractImageUrl(post);
        if (!imgData) return;
        const id = post.uri || `post-${Math.random()}`;
        postMap.set(id, post);
        newItems.push({
          id,
          img: imgData.url,
          url: post.uri ? `/feed/${encodeURIComponent(post.uri)}` : '',
          height: calculateHeight(imgData.aspectRatio),
        });
      });

      setRawPosts(prev => {
        const merged = new Map(prev);
        postMap.forEach((v, k) => merged.set(k, v));
        return merged;
      });
      setItems(prev => [...prev, ...newItems]);
      cursorRef.current = data.cursor || null;
    } catch {
      // silent
    }
    setLoadingMore(false);
    fetchingRef.current = false;
  }, [loadFeed]);

  const handleItemClick = useCallback((item: MasonryItem) => {
    const post = rawPosts.get(item.id);
    if (post) setSelectedPost(post);
  }, [rawPosts]);

  if (!feedUri) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 text-lg">No feed selected</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-y-auto [scroll-behavior:smooth]">
      <button
        onClick={() => router.push('/immersive')}
        className="fixed top-5 left-5 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-xl"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-white/30 text-lg">No images found in this feed</p>
        </div>
      ) : (
        <Masonry
          items={items}
          ease="power3.out"
          duration={0.6}
          stagger={0.04}
          animateFrom="bottom"
          scaleOnHover={true}
          hoverScale={0.95}
          blurToFocus={true}
          colorShiftOnHover={false}
          onLoadMore={loadMore}
          hasMore={!!cursorRef.current}
          onItemClick={handleItemClick}
        />
      )}

      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      )}

      {selectedPost && (
        <PostPopup
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
