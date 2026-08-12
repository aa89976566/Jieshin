import Link from "next/link";
import { notFound } from "next/navigation";
import { NarrativeWorkView } from "@/components/NarrativeWorkView";
import { WorkGallery } from "@/components/WorkGallery";
import { shouldUseNarrativeLayout } from "@/lib/narrative";
import {
  formatWorkYear,
  getGalleryImages,
  getWorkByLabel,
  getWorkBySlug,
  getWorkDetails,
  site,
} from "@/lib/site";

type WorkPageProps = {
  params: Promise<{ slug: string[] }>;
};

function resolveWork(slugParts: string[]) {
  if (slugParts.length === 1) {
    const segment = slugParts[0];
    const byLabel = getWorkByLabel(segment);
    if (byLabel) return byLabel;

    const bySlug = getWorkBySlug(segment);
    if (bySlug) return bySlug;
    return undefined;
  }

  return getWorkBySlug(slugParts.join("/"));
}

export async function generateStaticParams() {
  const labelRoutes = site.works.map((work) => ({ slug: [work.label] }));
  const legacyRoutes = site.works.map((work) => ({ slug: work.slug.split("/") }));
  return [...labelRoutes, ...legacyRoutes];
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;
  const work = resolveWork(slug);

  if (!work) notFound();

  const gallery = getGalleryImages(work);
  const details = getWorkDetails(work);
  const year = formatWorkYear(work);
  const useNarrative = shouldUseNarrativeLayout(work);

  if (useNarrative && work.imageContext) {
    const narrativeGallery = work.gallery?.length ? work.gallery : gallery;
    return (
      <NarrativeWorkView
        title={work.title}
        year={year}
        label={work.label}
        gallery={narrativeGallery}
        texts={work.texts}
        preamble={work.preamble}
        imageContext={work.imageContext}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:min-h-screen lg:grid-cols-[420px_1fr]">
      <aside className="sidebar-panel relative z-20 order-2 flex min-h-0 flex-1 flex-col border-t border-white/10 lg:order-none lg:max-h-screen lg:border-t-0">
        <header className="shrink-0 border-b border-white/10 px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-widest text-white/60 transition-colors hover:text-white"
          >
            ← Back
          </Link>
          <p className="mt-4 font-mono text-[11px] text-white/55 sm:mt-6">{year}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-3xl">
            {work.title}
          </h1>
          <p className="mt-2 font-mono text-[11px] text-white/55">{work.label}</p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {details.length > 0 ? (
            <div className="space-y-4">
              {details.map((paragraph, index) => (
                <p
                  key={`${work.label}-${index}`}
                  className="font-mono text-[11px] leading-relaxed text-white/75"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] leading-relaxed text-white/55">
              Photographic and material studies from the studio archive.
            </p>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 px-5 py-3 sm:px-6 sm:py-4">
          <p className="font-mono text-[10px] text-white/45">
            {gallery.length} image{gallery.length === 1 ? "" : "s"}
          </p>
        </footer>
      </aside>

      <div className="image-stage order-1 h-[48vh] shrink-0 overflow-y-auto overscroll-contain sm:h-[54vh] lg:order-none lg:fixed lg:left-[420px] lg:right-0 lg:top-0 lg:h-screen">
        <WorkGallery images={gallery} title={work.title} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: WorkPageProps) {
  const { slug } = await params;
  const work = resolveWork(slug);
  if (!work) return {};

  return {
    title: `${work.title} — Jieshin Tseng`,
  };
}
