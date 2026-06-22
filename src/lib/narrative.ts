export function shouldUseNarrativeLayout(work: {
  texts?: string[];
  gallery?: string[];
  imageContext?: string[][];
}): boolean {
  const gallery = work.gallery?.length ?? 0;
  const texts = work.texts?.length ?? 0;
  const hasContext = work.imageContext?.some((ctx) => ctx.length > 0) ?? false;
  return gallery >= 2 && texts >= 1 && hasContext;
}

export function getActiveContext(
  imageContext: string[][] | undefined,
  imageIndex: number,
): string[] {
  if (!imageContext?.length) return [];
  return imageContext[imageIndex] ?? imageContext[0] ?? [];
}
