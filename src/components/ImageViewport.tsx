"use client";

type ImageViewportProps = {
  src: string;
  alt?: string;
};

export function ImageViewport({ src, alt = "" }: ImageViewportProps) {
  return (
    <div className="image-viewport relative h-full w-full bg-[#0a0a0a]">
      <img
        key={src}
        src={src}
        alt={alt}
        className="h-full w-full object-contain object-center"
        decoding="async"
      />
    </div>
  );
}
