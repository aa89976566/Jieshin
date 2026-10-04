import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/site";

function artistSubtitle() {
  const birthYear = site.artist.birth_year ?? "2003";
  const birthplace = site.artist.birthplace ?? "Taiwan";
  return `b. ${birthYear}, ${birthplace}\nLives & works in ${site.artist.location}`;
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-[420px]">
        <SiteHeader
          name={site.artist.name_en}
          subtitle={artistSubtitle()}
          email={site.artist.email}
        />

        <main className="px-6 py-8">
          <p className="font-mono text-[11px] leading-relaxed text-white/75">
            {site.bio}
          </p>

          <Link
            href="/cv"
            className="mt-8 inline-block font-mono text-[11px] uppercase tracking-widest text-white underline underline-offset-4 transition-colors hover:text-white/70"
          >
            CV
          </Link>

          <p className="mt-16 text-right font-mono text-[10px] text-white/35">
            all work © {site.artist.name_en} {new Date().getFullYear()}.
          </p>
        </main>
      </div>
    </div>
  );
}
