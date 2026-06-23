"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jieshin-mural-cta-dismissed";
const SHOW_DELAY_MS = 5000;

type CollaborationCtaProps = {
  email: string;
};

export function CollaborationCta({ email }: CollaborationCtaProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(STORAGE_KEY) === "1";
    setDismissed(wasDismissed);
    if (wasDismissed) return;

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    setDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-end sm:justify-start sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          <div
            role="dialog"
            aria-labelledby="mural-cta-title"
            aria-describedby="mural-cta-desc"
            className="relative z-10 w-full max-w-sm border border-white/10 bg-[#0c0c0c] p-6 shadow-2xl sm:max-w-[360px]"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Open collaboration
            </p>
            <h2
              id="mural-cta-title"
              className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white"
            >
              Mural painting
            </h2>
            <p
              id="mural-cta-desc"
              className="mt-4 font-mono text-[11px] leading-relaxed text-white/70"
            >
              We are looking for walls to paint. If you have a surface that wants
              to become something else — a studio, a café, a corridor — reach
              out.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`mailto:${email}?subject=Mural%20collaboration`}
                className="rounded-full border border-white bg-white px-5 py-2 font-mono text-[11px] uppercase tracking-wider text-black transition-colors hover:bg-white/90"
                onClick={dismiss}
              >
                Get in touch
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="font-mono text-[11px] uppercase tracking-wider text-white/45 transition-colors hover:text-white/70"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {dismissed && !open && (
        <button
          type="button"
          onClick={() => {
            setDismissed(false);
            setOpen(true);
          }}
          className="fixed bottom-6 right-20 z-30 border border-white/20 bg-black/80 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
        >
          Murals
        </button>
      )}
    </>
  );
}
