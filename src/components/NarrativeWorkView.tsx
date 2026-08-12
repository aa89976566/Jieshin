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
  const stageRect = stage.getBoundingClientRect();
  const figureRect = figure.getBoundingClientRect();
  const figureCenter =
    figureRect.top - stageRect.top + stage.scrollTop + figureRect.height / 2;
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

  const counterLabel = `${String(activeImage + 1).padStart(2, "0")} / ${String(gallery.length).padStart(2, "0")}`;

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:grid lg:h-auto lg:min-h-screen lg:grid-cols-[420px_1fr] lg:overflow-visible">
      {/*
        Mobile: image stage on top + text below in one viewport (mirrors desktop dual-pane sync).
        Desktop: sidebar left, fixed image stage right.
      */}
      <aside className="sidebar-panel relative z-20 order-2 flex min-h-0 flex-1 flex-col border-t border-white/10 lg:order-none lg:max-h-screen lg:border-t-0">
        <header className="shrink-0 border-b border-white/10 px-5 pb-3 pt-4 sm:px-6 sm:pb-6 sm:pt-8">
          <div className="flex items-baseline justify-between gap-3">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-widest text-white/60 transition-colors hover:text-white"
            >
              ← Back
            </Link>
            <p className="font-mono text-[10px] tabular-nums text-white/45 lg:hidden">
              {counterLabel}
            </p>
          </div>
          <p className="mt-3 font-mono text-[11px] text-white/55 sm:mt-6">{year}</p>
          <h1 className="mt-1 text-xl font-semibold leading-tight tracking-[-0.03em] text-white sm:mt-2 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-white/55 sm:mt-2">{label}</p>
        </header>

        <div
          ref={sidebarScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 scroll-smooth sm:px-6 sm:py-6"
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

          <div className="space-y-3 sm:space-y-4">
            {texts.map((line) => {
              const isActive = activeContextSet.has(line);

              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => scrollToText(line)}
                  className="block w-full text-left"
                  aria-current={isActive ? "true" : undefined}
                >
                  <p
                    ref={(el) => {
                      if (el) textRefs.current.set(line, el);
                      else textRefs.current.delete(line);
                    }}
                    data-active-text={isActive ? "true" : "false"}
                    className={`rounded-sm font-mono text-[11px] leading-relaxed transition-[color,background-color,border-color] duration-200 ${
                      isActive
                        ? "bg-white/[0.07] text-white"
                        : "text-white/28 hover:text-white/45"
                    }`}
                    style={{
                      borderLeft: isActive
                        ? "2px solid rgba(255,255,255,0.55)"
                        : "2px solid transparent",
                      paddingLeft: "12px",
                      paddingTop: isActive ? "6px" : "0",
                      paddingBottom: isActive ? "6px" : "0",
                      paddingRight: isActive ? "8px" : "0",
                    }}
                  >
                    {line}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <footer className="hidden shrink-0 border-t border-white/10 px-6 py-4 lg:block">
          <p className="font-mono text-[10px] tabular-nums text-white/45">
            {counterLabel}
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
        className="image-stage narrative-stage relative order-1 h-[46vh] shrink-0 overflow-y-auto overscroll-contain sm:h-[52vh] lg:order-none lg:fixed lg:left-[420px] lg:right-0 lg:top-0 lg:h-screen"
      >
        <div className="pointer-events-none sticky top-0 z-10 flex justify-end p-3 lg:hidden">
          <p className="rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] tabular-nums text-white/80 backdrop-blur-sm">
            {counterLabel}
          </p>
        </div>
        <div className="flex flex-col gap-8 px-3 pb-3 pt-0 sm:gap-10 sm:px-4 sm:pb-4 md:px-8 md:pb-8 lg:pt-8">
          {gallery.map((src, index) => (
            <NarrativeImage
              key={`${src}-${index}`}
              src={src}
              title={title}
              index={index}
              isActive={index === activeImage}
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
  isActive,
}: {
  src: string;
  title: string;
  index: number;
  isActive: boolean;
}) {
  const [imageSrc, setImageSrc] = useState(highResImageUrl(src));

  return (
    <figure
      data-image-index={index}
      data-active-image={isActive ? "true" : "false"}
      className={`flex min-h-[40vh] w-full snap-center items-center justify-center transition-opacity duration-300 sm:min-h-[46vh] lg:min-h-[78vh] ${
        isActive ? "opacity-100" : "opacity-55 lg:opacity-100"
      }`}
    >
      <img
        src={imageSrc}
        alt={`${title} — image ${index + 1}`}
        className="mx-auto max-h-[40vh] w-full object-contain object-center sm:max-h-[46vh] lg:max-h-[78vh]"
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
