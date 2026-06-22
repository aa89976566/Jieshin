import siteData from "@/data/site.json";

export type Work = {
  id: string;
  slug: string;
  title: string;
  year: string;
  label: string;
  image: string;
  remoteImage: string;
  url?: string;
  gallery: string[];
  description: string;
  texts: string[];
  preamble?: string[];
  imageContext?: string[][];
};

export type SiteData = {
  artist: {
    name_zh: string;
    name_en: string;
    location: string;
    email: string;
    instagram: string;
    website: string;
  };
  bio: string;
  works: Work[];
};

export const site = siteData as SiteData;

const PORTRAIT_ID = "c97dd1a4-6f18-42a3-8adc-ebd5d3a63c66";

export function getWorkByLabel(label: string): Work | undefined {
  return site.works.find((work) => work.label === label);
}

export function getWorkBySlug(slug: string): Work | undefined {
  const normalized = slug
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");

  return site.works.find((work) => work.slug === normalized);
}

export function getGalleryImages(work: Work): string[] {
  const images = work.gallery?.length
    ? work.gallery
    : work.remoteImage
      ? [work.remoteImage]
      : [];

  const filtered = images.filter((url) => !url.includes(PORTRAIT_ID));
  const unique = [...new Set(filtered.length ? filtered : images)];

  if (unique.length <= 1 && work.remoteImage && !unique.includes(work.remoteImage)) {
    return [work.remoteImage, ...unique];
  }

  return unique;
}

export function workPath(work: Work): string {
  return `/works/${work.slug}`;
}

export function formatWorkYear(work: Work): string {
  if (work.year && work.year !== "—") return work.year;
  const match = work.slug.match(/^(20\d{2})/);
  return match ? match[1] : "Ongoing";
}

export function getWorkDetails(work: Work): string[] {
  if (work.texts?.length) return work.texts;
  if (work.description?.trim()) {
    return work.description.split("\n\n").filter(Boolean);
  }
  return [];
}
