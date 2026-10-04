"use client";

import Link from "next/link";
import { useState } from "react";

type SiteHeaderProps = {
  name: string;
  subtitle: string;
  email: string;
};

export function SiteHeader({ name, subtitle, email }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b border-white/10 px-6 pb-6 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="block">
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white">
              {name}
            </h1>
          </Link>
          <p className="mt-3 whitespace-pre-line font-mono text-[11px] leading-relaxed text-white/55">
            {subtitle}
          </p>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mt-1 flex flex-col gap-1.5 p-1"
        >
          <span className="block h-px w-5 bg-white/80" />
          <span className="block h-px w-5 bg-white/80" />
          <span className="block h-px w-5 bg-white/80" />
        </button>
      </div>

      {open && (
        <nav className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 font-mono text-[11px] uppercase tracking-widest text-white/70">
          <Link href="/works" className="hover:text-white" onClick={() => setOpen(false)}>
            Works
          </Link>
          <Link href="/cv" className="hover:text-white" onClick={() => setOpen(false)}>
            CV
          </Link>
          <Link
            href={`mailto:${email}`}
            className="hover:text-white"
            onClick={() => setOpen(false)}
          >
            Contact
          </Link>
        </nav>
      )}
    </header>
  );
}
