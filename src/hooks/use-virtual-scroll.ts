"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type VirtualScrollRange = {
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
};

type UseVirtualScrollOptions = {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
};

const EMPTY_RANGE: VirtualScrollRange = {
  startIndex: 0,
  endIndex: -1,
  paddingTop: 0,
  paddingBottom: 0,
};

/** Fixed-height list windowing without extra dependencies. */
export function useVirtualScroll(
  scrollRef: RefObject<HTMLElement | null>,
  { itemCount, itemHeight, overscan = 8 }: UseVirtualScrollOptions
): VirtualScrollRange {
  const [range, setRange] = useState<VirtualScrollRange>(EMPTY_RANGE);

  const recalculate = useCallback(() => {
    const el = scrollRef.current;
    if (!el || itemCount === 0) {
      setRange(EMPTY_RANGE);
      return;
    }

    const scrollTop = el.scrollTop;
    const viewportHeight = el.clientHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
    );

    setRange({
      startIndex,
      endIndex,
      paddingTop: startIndex * itemHeight,
      paddingBottom: Math.max(0, (itemCount - endIndex - 1) * itemHeight),
    });
  }, [scrollRef, itemCount, itemHeight, overscan]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", recalculate, { passive: true });
    const observer = new ResizeObserver(recalculate);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", recalculate);
      observer.disconnect();
    };
  }, [scrollRef, recalculate]);

  return range;
}
