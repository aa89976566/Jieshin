"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SiteData } from "@/lib/site";
import { highResImageUrl } from "@/lib/images";
import { workPath } from "@/lib/site";
import { ImageViewport } from "./ImageViewport";
import { SocialBar } from "./SocialBar";

type HomeShellProps = {
  data: SiteData;
};

function formatDate(year: string, slug: string) {
  if (year && year !== "—") return year;
  const match = slug.match(/^(20\d{2})/);
  return match ? match[1] : "Ongoing";
}

const HERO_IMAGE =
  "https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/c97dd1a4-6f18-42a3-8adc-ebd5d3a63c66/_dsc0154/public";

export function HomeShell({ data }: HomeShellProps) {
  const slides = useMemo(
    () => [
      { src: highResImageUrl(HERO_IMAGE), title: data.artist.name_en },
      ...data.works.map((work) => ({
        src: highResImageUrl(work.remoteImage),
        title: work.title,
      })),
    ],
    [data.artist.name_en, data.works],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[420px_1fr]">
      <aside className="sidebar-panel relative z-20 flex min-h-screen flex-col">
        <header className="border-b border-white/10 px-6 pb-6 pt-8">
          <h1 className="text-[3.25rem] font-semibold leading-[0.9] tracking-[-0.05em] text-white">
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
          <ul className="divide-y divide-white/10">
            {data.works.map((work, index) => {
              const isArchived = Number(work.year) < 2024;
              const isActive = activeIndex === index + 1;

              return (
                <li key={work.id}>
                    <Link
                      href={workPath(work)}
                    className={`group grid grid-cols-[1fr_44px] gap-4 py-5 transition-colors ${
                      isActive ? "bg-white/5" : "hover:bg-white/[0.03]"
                    }`}
                    onMouseEnter={() => setActiveIndex(index + 1)}
                    onFocus={() => setActiveIndex(index + 1)}
                    onMouseLeave={() => setActiveIndex(0)}
                    onBlur={() => setActiveIndex(0)}
                  >
                    <div>
                      <p className="font-mono text-[11px] text-white/55">
                        {formatDate(work.year, work.slug)}
                      </p>
                      <p
                        className={`mt-2 font-mono text-[11px] leading-relaxed text-white/90 ${
                          isArchived ? "line-through decoration-white/35" : ""
                        }`}
                      >
                        {work.title}
                      </p>
                    </div>
                    <span className="pt-0.5 text-right font-mono text-[11px] text-white/55">
                      {work.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <div className="image-stage order-first h-[42vh] lg:order-none lg:fixed lg:left-[420px] lg:right-0 lg:top-0 lg:h-screen">
        <ImageViewport src={activeSlide.src} alt={activeSlide.title} />
      </div>

      <SocialBar email={data.artist.email} instagram={data.artist.instagram} />
    </div>
  );
}
