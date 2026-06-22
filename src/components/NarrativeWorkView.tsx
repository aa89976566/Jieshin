"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewportScrollSpy } from "@/hooks/useViewportScrollSpy";
import { highResImageUrl } from "@/lib/images";
import { getActiveContext } from "@/lib/narrative";

type NarrativeWorkViewProps = {
  title: string;
  year: string;
  label: string;
  gallery: string[];
  texts: string[];
  preamble?: string[];
  imageContext: string[][];
};

function toPublicUrl(url: string): string {
  if (url.includes("images.spr.so") && !url.endsWith("/public")) {
    return url.replace(/\/w=.*$/, "/public");
  }
  return url;
}

function scrollWithinContainer(
  container: HTMLElement,
  target: HTMLElement,
  smooth: boolean,
) {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const nextTop =
    targetRect.top - containerRect.top + container.scrollTop - 28;

  container.scrollTo({
    top: Math.max(0, nextTop),
    behavior: smooth ? "smooth" : "auto",
  });
}

function scrollImageIntoStage(
  stage: HTMLElement,
  figure: HTMLElement,
  smooth: boolean,
) {
  const figureCenter = figure.offsetTop + figure.offsetHeight / 2;
  const nextTop = figureCenter - stage.clientHeight / 2;

  stage.scrollTo({
    top: Math.max(0, nextTop),
    behavior: smooth ? "smooth" : "auto",
  });
}

export function NarrativeWorkView({
  title,
  year,
  label,
  gallery,
  texts,
  preamble = [],
  imageContext,
}: NarrativeWorkViewProps) {
  const imageStageRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<Map<string, HTMLParagraphElement>>(new Map());
  const prefersReducedMotion = useRef(false);
  const isSyncingRef = useRef(false);

  const activeImage = useViewportScrollSpy({
    itemSelector: "[data-image-index]",
    containerRef: imageStageRef,
    itemCount: gallery.length,
  });

  const activeContext = useMemo(
    () => getActiveContext(imageContext, activeImage),
    [imageContext, activeImage],
  );

  const activeContextSet = useMemo(
    () => new Set(activeContext),
    [activeContext],
  );

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (isSyncingRef.current || activeContext.length === 0) return;

    const firstLine = activeContext[0];
    const el = textRefs.current.get(firstLine);
    const sidebar = sidebarScrollRef.current;
    if (!el || !sidebar) return;

    scrollWithinContainer(sidebar, el, !prefersReducedMotion.current);
  }, [activeContext, activeImage]);

  const scrollToImage = useCallback((imageIndex: number) => {
    isSyncingRef.current = true;

    const stage = imageStageRef.current;
    const figure = stage?.querySelector<HTMLElement>(
      `[data-image-index="${imageIndex}"]`,
    );

    if (stage && figure) {
      scrollImageIntoStage(stage, figure, !prefersReducedMotion.current);
    } else {
      figure?.scrollIntoView({
        behavior: prefersReducedMotion.current ? "auto" : "smooth",
        block: "center",
      });
    }

    window.setTimeout(() => {
      isSyncingRef.current = false;
    }, prefersReducedMotion.current ? 0 : 450);
  }, []);

  const scrollToText = useCallback(
    (line: string) => {
      const imageIndex = imageContext.findIndex((ctx) => ctx.includes(line));
      if (imageIndex >= 0) scrollToImage(imageIndex);
    },
    [imageContext, scrollToImage],
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[420px_1fr]">
      <aside className="sidebar-panel relative z-20 flex max-h-screen flex-col">
        <header className="border-b border-white/10 px-6 pb-6 pt-8">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-widest text-white/60 transition-colors hover:text-white"
          >
            ← Back
          </Link>
          <p className="mt-6 font-mono text-[11px] text-white/55">{year}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em] text-white">
            {title}
          </h1>
          <p className="mt-2 font-mono text-[11px] text-white/55">{label}</p>
        </header>

        <div
          ref={sidebarScrollRef}
          className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth"
        >
          {preamble.length > 0 && (
            <div className="mb-6 space-y-3 border-b border-white/10 pb-6">
              {preamble.map((line) => (
                <p
                  key={`pre-${line}`}
                  className="font-mono text-[11px] leading-relaxed text-white/70"
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {texts.map((line) => {
              const isActive = activeContextSet.has(line);

              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => scrollToText(line)}
                  className="block w-full text-left"
                >
                  <p
                    ref={(el) => {
                      if (el) textRefs.current.set(line, el);
                      else textRefs.current.delete(line);
                    }}
                    className={`font-mono text-[11px] leading-relaxed ${
                      isActive
                        ? "text-white/90"
                        : "text-white/30 hover:text-white/45"
                    }`}
                    style={{
                      borderLeft: isActive
                        ? "2px solid rgba(255,255,255,0.4)"
                        : "2px solid transparent",
                      paddingLeft: "12px",
                    }}
                  >
                    {line}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-white/10 px-6 py-4">
          <p className="font-mono text-[10px] tabular-nums text-white/45">
            {String(activeImage + 1).padStart(2, "0")} /{" "}
            {String(gallery.length).padStart(2, "0")}
            {activeContext.length > 0 && (
              <span className="ml-3 text-white/30">
                · {activeContext.length} linked paragraph
                {activeContext.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </footer>
      </aside>

      <div
        ref={imageStageRef}
        className="image-stage narrative-stage order-first h-[62vh] overflow-y-auto overscroll-contain sm:h-[68vh] lg:order-none lg:fixed lg:left-[420px] lg:right-0 lg:top-0 lg:h-screen"
      >
        <div className="flex flex-col gap-10 p-4 md:p-8">
          {gallery.map((src, index) => (
            <NarrativeImage
              key={`${src}-${index}`}
              src={src}
              title={title}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NarrativeImage({
  src,
  title,
  index,
}: {
  src: string;
  title: string;
  index: number;
}) {
  const [imageSrc, setImageSrc] = useState(highResImageUrl(src));

  return (
    <figure
      data-image-index={index}
      className="flex min-h-[52vh] w-full snap-center items-center justify-center lg:min-h-[78vh]"
    >
      <img
        src={imageSrc}
        alt={`${title} — image ${index + 1}`}
        className="mx-auto max-h-[78vh] w-full object-contain object-center"
        loading={index < 2 ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          const fallback = toPublicUrl(src);
          if (imageSrc !== fallback) setImageSrc(fallback);
        }}
      />
    </figure>
  );
}
