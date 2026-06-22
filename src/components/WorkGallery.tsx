"use client";

import { useState } from "react";
import { highResImageUrl } from "@/lib/images";

type WorkGalleryProps = {
  images: string[];
  title: string;
};

function toPublicUrl(url: string): string {
  if (url.includes("images.spr.so") && !url.endsWith("/public")) {
    return url.replace(/\/w=.*$/, "/public");
  }
  return url;
}

export function WorkGallery({ images, title }: WorkGalleryProps) {
  if (!images.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="font-mono text-[11px] text-white/50">No images available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {images.map((src, index) => (
        <GalleryImage key={`${src}-${index}`} src={src} title={title} index={index} />
      ))}
    </div>
  );
}

function GalleryImage({
  src,
  title,
  index,
}: {
  src: string;
  title: string;
  index: number;
}) {
  const [imageSrc, setImageSrc] = useState(highResImageUrl(src));

  return (
    <figure className="w-full">
      <img
        src={imageSrc}
        alt={`${title} — image ${index + 1}`}
        className="mx-auto max-h-[85vh] w-full object-contain object-center"
        loading={index < 2 ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          const fallback = toPublicUrl(src);
          if (imageSrc !== fallback) setImageSrc(fallback);
        }}
      />
    </figure>
  );
}
