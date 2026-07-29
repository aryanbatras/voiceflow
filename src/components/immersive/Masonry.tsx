'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const get = () => {
    if (typeof window === 'undefined') return defaultValue;
    return values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue;
  };

  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
  }, [queries]);

  return value;
};

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};

const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.map(
      src =>
        new Promise<void>(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
};

interface Item {
  id: string;
  img: string;
  url: string;
  aspectRatio?: { width: number; height: number };
  isVideo?: boolean;
  videoUrl?: string;
}

interface GridItem extends Item {
  x: number;
  y: number;
  w: number;
  h: number;
  _key: string;
}

interface MasonryProps {
  items: Item[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onItemClick?: (item: Item) => void;
}

const Masonry: React.FC<MasonryProps> = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.04,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  onLoadMore,
  hasMore = false,
  onItemClick
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)'],
    [5, 4, 3],
    2
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [imagesReady, setImagesReady] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const getInitialPosition = (item: GridItem) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };

    let direction = animateFrom;
    if (animateFrom === 'random') {
      const dirs = ['top', 'bottom', 'left', 'right'];
      direction = dirs[Math.floor(Math.random() * dirs.length)] as typeof animateFrom;
    }

    switch (direction) {
      case 'top': return { x: item.x, y: -200 };
      case 'bottom': return { x: item.x, y: window.innerHeight + 200 };
      case 'left': return { x: -200, y: item.y };
      case 'right': return { x: window.innerWidth + 200, y: item.y };
      case 'center': return { x: containerRect.width / 2 - item.w / 2, y: containerRect.height / 2 - item.h / 2 };
      default: return { x: item.x, y: item.y + 100 };
    }
  };

  useEffect(() => {
    setImagesReady(false);
    preloadImages(items.map(i => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0);
    const gap = 2;
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;

    return items.map((child, idx) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + gap);

      const itemHeight = child.aspectRatio
        ? columnWidth * (child.aspectRatio.height / child.aspectRatio.width)
        : 400;

      const y = colHeights[col];
      colHeights[col] += itemHeight + gap;
      return { ...child, x, y, w: columnWidth, h: itemHeight, _key: `${child.id}-${idx}` };
    });
  }, [columns, items, width]);

  const hasMounted = useRef(false);
  const seenKeys = useRef<Set<string>>(new Set());
  const newItemCounter = useRef(0);

  // IMMEDIATELY hide new items at their start position BEFORE browser paint
  // This prevents the flash of items at CSS default (0,0) before GSAP animates them
  useLayoutEffect(() => {
    grid.forEach(item => {
      if (!seenKeys.current.has(item._key)) {
        const start = getInitialPosition(item);
        gsap.set(`[data-key="${item._key}"]`, {
          opacity: 0,
          x: start.x,
          y: start.y,
          width: item.w,
          height: item.h,
        });
      }
    });
  }, [grid]);

  useLayoutEffect(() => {
    if (!imagesReady) return;

    newItemCounter.current = 0;

    grid.forEach((item, index) => {
      const selector = `[data-key="${item._key}"]`;
      const animProps = { x: item.x, y: item.y, width: item.w, height: item.h };
      const isNewItem = !seenKeys.current.has(item._key);

      if (!hasMounted.current || isNewItem) {
        // First mount OR new items: animate from their hidden start position
        const start = getInitialPosition(item);
        const newItemIdx = isNewItem ? newItemCounter.current++ : index;
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: start.x,
            y: start.y,
            width: item.w,
            height: item.h,
            ...(blurToFocus && { filter: 'blur(10px)' })
          },
          {
            opacity: 1,
            ...animProps,
            ...(blurToFocus && { filter: 'blur(0px)' }),
            duration: 0.6,
            ease: 'power3.out',
            delay: isNewItem
              ? Math.min(newItemIdx, 20) * stagger
              : index * stagger
          }
        );
        seenKeys.current.add(item._key);
      } else {
        // Existing item — smooth transition
        gsap.to(selector, {
          ...animProps,
          duration,
          ease,
          overwrite: 'auto'
        });
      }
    });

    hasMounted.current = true;
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease]);

  // Reset tracking when items are cleared
  useEffect(() => {
    if (items.length === 0) {
      seenKeys.current.clear();
      hasMounted.current = false;
    }
  }, [items.length]);

  useEffect(() => {
    if (!onLoadMore || !hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore) {
          onLoadMore();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, items.length]);

  const handleMouseEnter = (key: string) => {
    if (scaleOnHover) {
      gsap.to(`[data-key="${key}"]`, { scale: hoverScale, duration: 0.3, ease: 'power2.out' });
    }
  };

  const handleMouseLeave = (key: string) => {
    if (scaleOnHover) {
      gsap.to(`[data-key="${key}"]`, { scale: 1, duration: 0.3, ease: 'power2.out' });
    }
  };

  const containerHeight = useMemo(() => {
    if (!grid.length) return 0;
    return Math.max(...grid.map(g => g.y + g.h));
  }, [grid]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: containerHeight ? `${containerHeight}px` : '100vh' }}>
      {grid.map(item => (
        <div
          key={item._key}
          data-key={item._key}
          className="absolute box-content overflow-hidden rounded-xl cursor-pointer bg-transparent"
          style={{ willChange: 'transform, width, height, opacity' }}
          onClick={() => onItemClick ? onItemClick(item) : undefined}
          onMouseEnter={() => handleMouseEnter(item._key)}
          onMouseLeave={() => handleMouseLeave(item._key)}
        >
          {item.isVideo ? (
            <video
              src={item.videoUrl}
              poster={item.img}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={item.img}
              alt=""
              className="w-full h-full object-contain select-none"
              loading="lazy"
              draggable={false}
            />
          )}
        </div>
      ))}
      {hasMore && <div ref={sentinelRef} className="h-4 w-full" />}
    </div>
  );
};

export default Masonry;
