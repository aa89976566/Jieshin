import Link from "next/link";
import { site } from "@/lib/site";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto w-full max-w-[420px] px-6 py-8">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-widest text-white/60 transition-colors hover:text-white"
        >
          ← Back
        </Link>

        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.04em]">
          {site.artist.name_en}
        </h1>
        <p className="mt-2 font-mono text-[11px] text-white/55">
          {site.artist.name_zh} · {site.artist.location}
        </p>

        <p className="mt-8 font-mono text-[11px] leading-relaxed text-white/75">
          {site.bio}
        </p>

        <div className="mt-10 space-y-2 font-mono text-[11px] text-white/70">
          <p>{site.artist.email}</p>
          <p>{site.artist.instagram}</p>
        </div>
      </main>
    </div>
  );
}
