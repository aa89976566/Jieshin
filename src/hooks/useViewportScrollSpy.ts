"use client";

import { useEffect, useRef, useState } from "react";

type UseViewportScrollSpyOptions = {
  itemSelector: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  itemCount?: number;
};

/**
 * Tracks which item is closest to the vertical center of a scroll container
 * (or the window). Prefers IntersectionObserver when a container is provided,
 * with a rAF scroll fallback for broad compatibility.
 */
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

    const commit = (next: number) => {
      if (next === activeRef.current) return;
      activeRef.current = next;
      setActiveIndex(next);
    };

    const measure = () => {
      rafRef.current = null;
      const container = containerRef?.current ?? null;
      const root: ParentNode = container ?? document;
      const items = root.querySelectorAll<HTMLElement>(itemSelector);
      if (!items.length) return;

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

      commit(bestIndex);
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(measure);
    };

    measure();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);

    const container = containerRef?.current;
    container?.addEventListener("scroll", schedule, { passive: true });
    // iOS / trackpad: also catch gesture end
    container?.addEventListener("touchmove", schedule, { passive: true });
    container?.addEventListener("touchend", schedule, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && container
        ? new ResizeObserver(schedule)
        : null;
    if (container) resizeObserver?.observe(container);

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && container) {
      intersectionObserver = new IntersectionObserver(
        () => schedule(),
        {
          root: container,
          // Bias toward the vertical center band of the stage
          rootMargin: "-35% 0px -35% 0px",
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      );
      container
        .querySelectorAll<HTMLElement>(itemSelector)
        .forEach((el) => intersectionObserver?.observe(el));
    }

    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(schedule)
        : null;
    mutationObserver?.observe(container ?? document.body, {
      childList: true,
      subtree: true,
    });

    const images = (container ?? document).querySelectorAll<HTMLImageElement>(
      `${itemSelector} img`,
    );
    images.forEach((img) => {
      if (!img.complete) img.addEventListener("load", schedule, { once: true });
    });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      container?.removeEventListener("scroll", schedule);
      container?.removeEventListener("touchmove", schedule);
      container?.removeEventListener("touchend", schedule);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, disabled, itemCount, itemSelector]);

  return activeIndex;
}
