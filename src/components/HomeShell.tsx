"use client";

import Link from "next/link";
import type { SiteData } from "@/lib/site";
import { workPath } from "@/lib/site";
import { SocialBar } from "./SocialBar";

type HomeShellProps = {
  data: SiteData;
};

function formatDate(year: string, slug: string) {
  if (year && year !== "—") return year;
  const match = slug.match(/^(20\d{2})/);
  return match ? match[1] : "Ongoing";
}

export function HomeShell({ data }: HomeShellProps) {
  return (
    <div className="min-h-screen">
      <aside className="sidebar-panel relative z-20 mx-auto flex min-h-screen w-full max-w-[420px] flex-col border-r-0">
        <header className="border-b border-white/10 px-6 pb-6 pt-8">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-widest text-white/60 transition-colors hover:text-white"
          >
            ← Home
          </Link>
          <h1 className="mt-6 text-[3.25rem] font-semibold leading-[0.9] tracking-[-0.05em] text-white">
            {data.artist.name_en}
          </h1>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
            {data.artist.name_zh}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href={`mailto:${data.artist.email}`}
              className="rounded-full border border-white/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
            >
              Email
            </Link>
            <Link
              href={`https://instagram.com/${data.artist.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
            >
              Instagram
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <ul className="divide-y divide-white/10 pb-4">
            {data.works.map((work) => (
              <li key={work.id}>
                <Link
                  href={workPath(work)}
                  className="group grid grid-cols-[minmax(0,1fr)_2.75rem] items-start gap-3 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-white/55">
                      {formatDate(work.year, work.slug)}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/90 break-words">
                      {work.title}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-white/55">
                    {work.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <SocialBar email={data.artist.email} instagram={data.artist.instagram} />
    </div>
  );
}
