import Link from "next/link";
import { SocialBar } from "@/components/SocialBar";
import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto w-full max-w-[420px] px-6 py-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/45">
          CV
        </p>

        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em]">
          {site.artist.name_en}
        </h1>
        <p className="mt-2 font-mono text-[11px] text-white/55">
          {site.artist.name_zh} · {site.artist.location}
        </p>

        <p className="mt-8 whitespace-pre-line font-mono text-[11px] leading-relaxed text-white/75">
          {site.bio}
        </p>

        <div className="mt-10 space-y-2 font-mono text-[11px] text-white/70">
          <p>{site.artist.email}</p>
          <p>{site.artist.instagram}</p>
        </div>

        <div className="mt-10">
          <Link
            href="/works"
            className="inline-flex rounded-full border border-white/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
          >
            Works
          </Link>
        </div>
      </main>

      <SocialBar email={site.artist.email} instagram={site.artist.instagram} />
    </div>
  );
}
