"use client";

import { useEffect, useRef, useState } from "react";

type UseViewportScrollSpyOptions = {
  itemSelector: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  itemCount?: number;
};

export function useViewportScrollSpy({
  itemSelector,
  containerRef,
  disabled = false,
  itemCount = 0,
}: UseViewportScrollSpyOptions) {
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    if (disabled) return;

    const measure = () => {
      rafRef.current = null;
      const items = document.querySelectorAll<HTMLElement>(itemSelector);
      if (!items.length) return;

      const container = containerRef?.current;
      const centerY = container
        ? container.getBoundingClientRect().top + container.clientHeight / 2
        : window.innerHeight / 2;

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      items.forEach((item) => {
        const index = Number(item.dataset.imageIndex);
        if (Number.isNaN(index)) return;

        const rect = item.getBoundingClientRect();
        if (rect.height === 0) return;

        const itemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenter - centerY);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      if (bestIndex !== activeRef.current) {
        activeRef.current = bestIndex;
        setActiveIndex(bestIndex);
      }
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(measure);
    };

    measure();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const container = containerRef?.current;
    container?.addEventListener("scroll", schedule, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && container
        ? new ResizeObserver(schedule)
        : null;
    resizeObserver?.observe(container!);

    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(schedule)
        : null;
    mutationObserver?.observe(container ?? document.body, {
      childList: true,
      subtree: true,
    });

    document.querySelectorAll<HTMLImageElement>(`${itemSelector} img`).forEach((img) => {
      if (!img.complete) img.addEventListener("load", schedule, { once: true });
    });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      container?.removeEventListener("scroll", schedule);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, disabled, itemCount, itemSelector]);

  return activeIndex;
}
