import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";

interface VirtualListProps<T> {
  /** All items to render */
  items: T[];
  /** Fixed height of each item in pixels */
  itemHeight: number;
  /** Total height of the scrollable container */
  containerHeight: number;
  /** Number of extra items to render above/below the viewport */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor */
  getKey: (item: T, index: number) => string;
  /** Optional className for the outer container */
  className?: string;
}

function VirtualListInner<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  getKey,
  className = "",
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length - 1, Math.floor(scrollTop / itemHeight) + visibleCount + overscan);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const result: { item: T; index: number }[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({ item: items[i], index: i });
    }
    return result;
  }, [items, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ item, index }) => (
          <div
            key={getKey(item, index)}
            style={{
              position: "absolute",
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Wrap with memo. Use a type assertion to preserve the generic signature.
const VirtualList = React.memo(VirtualListInner) as typeof VirtualListInner;
export default VirtualList;
