import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/lib/site";

function artistSubtitle() {
  const birthYear = site.artist.birth_year ?? "2003";
  const birthplace = site.artist.birthplace ?? "Taiwan";
  return `b. ${birthYear}, ${birthplace}\nLives & works in ${site.artist.location}`;
}

export default function CvPage() {
  const birthYear = site.artist.birth_year ?? "2003";
  const birthplace = site.artist.birthplace ?? "Taiwan";
  const sections = site.cv?.sections ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-[420px]">
        <SiteHeader
          name={site.artist.name_en}
          subtitle={artistSubtitle()}
          email={site.artist.email}
        />

        <main className="px-6 py-8">
          <h2 className="text-2xl font-semibold uppercase tracking-[-0.03em] text-white">
            {site.artist.name_en}
          </h2>
          <p className="mt-3 font-mono text-[11px] font-semibold text-white/90">
            b. {birthYear}, {birthplace}
          </p>
          <p className="mt-1 font-mono text-[11px] text-white/70">
            Lives and works in {site.artist.location}
          </p>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-white underline underline-offset-4">
                  {section.title}
                </h3>

                <div className="mt-6 space-y-6">
                  {section.years.map((group) => (
                    <div key={`${section.title}-${group.year}`}>
                      <p className="font-mono text-[11px] font-semibold text-white">
                        {group.year}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {group.items.map((item) => (
                          <li
                            key={item}
                            className="font-mono text-[11px] leading-relaxed text-white/75"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 space-y-2 font-mono text-[11px] text-white/70">
            <p>{site.artist.email}</p>
            <p>{site.artist.instagram}</p>
          </div>

          <Link
            href="/"
            className="mt-10 inline-block font-mono text-[11px] uppercase tracking-widest text-white/60 transition-colors hover:text-white"
          >
            ← Back
          </Link>

          <p className="mt-16 text-right font-mono text-[10px] text-white/35">
            all work © {site.artist.name_en} {new Date().getFullYear()}.
          </p>
        </main>
      </div>
    </div>
  );
}
