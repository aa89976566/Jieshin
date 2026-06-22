function isSkipText(text: string): boolean {
  const t = text.trim();
  if (/^May \d/.test(t)) return true;
  if (t.includes("Created") && /\d{4}/.test(t)) return true;
  return false;
}

function isPreamble(text: string): boolean {
  const t = text.trim();
  return (
    t.includes("cm") ||
    ((t.includes("found ") || t.includes("Found ")) && t.length < 220)
  );
}

function dividerKind(text: string): "skip" | "hard" | "soft" | null {
  const t = text.trim();
  if (/^0{20,}$/.test(t)) return "skip";
  if (/^O+o+O/i.test(t)) return "soft";
  if (t.includes("COLLECTVIBRATIONS")) return "hard";
  if (/^(\d)\1{8,}$/.test(t)) return "soft";
  return null;
}

type Block =
  | { type: "image"; url: string }
  | { type: "text"; text: string };

export type NarrativeFromBlocks = {
  gallery: string[];
  texts: string[];
  preamble: string[];
  imageContext: string[][];
};

type Scene = {
  textsBefore: string[];
  imageUrls: string[];
  textsAfter: string[];
};

function countLeadingImages(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.type === "image") count += 1;
    else break;
  }
  return count;
}

/** Texts between the leading image run and the next image group (page intro). */
function getIntroForLeadingImages(
  blocks: Block[],
  leadingCount: number,
): string[] {
  const intro: string[] = [];
  let imagesSeen = 0;
  let collecting = false;

  for (const block of blocks) {
    if (block.type === "image") {
      imagesSeen += 1;
      if (imagesSeen > leadingCount) break;
      if (imagesSeen === leadingCount) collecting = true;
      continue;
    }

    if (!collecting || imagesSeen < leadingCount) continue;

    const { text } = block;
    if (isSkipText(text)) continue;

    const kind = dividerKind(text);
    if (kind === "skip") continue;
    if (text.includes("COLLECTVIBRATIONS")) break;
    if (kind === "hard") break;
    if (kind === "soft") continue;

    intro.push(text);
  }

  return intro;
}

function appendTrailingTexts(
  blocks: Block[],
  gallery: string[],
  imageContext: string[][],
) {
  if (!gallery.length) return;

  let lastImageUrl: string | null = null;
  const trailing: string[] = [];

  for (const block of blocks) {
    if (block.type === "image") {
      lastImageUrl = block.url;
      trailing.length = 0;
      continue;
    }

    if (!lastImageUrl) continue;

    const { text } = block;
    const kind = dividerKind(text);
    if (kind === "skip" || isSkipText(text)) continue;
    if (kind === "hard" || kind === "soft") continue;

    trailing.push(text);
  }

  if (!trailing.length || !lastImageUrl) return;

  const lastIndex = gallery.lastIndexOf(lastImageUrl);
  if (lastIndex >= 0) {
    imageContext[lastIndex] = [...imageContext[lastIndex], ...trailing];
  }
}

export function buildNarrativeFromBlocks(blocks: Block[]): NarrativeFromBlocks {
  const gallery: string[] = [];
  const imageContext: string[][] = [];
  const orderedTexts: string[] = [];
  const preamble: string[] = [];

  const leadingCount = countLeadingImages(blocks);
  let scene: Scene = { textsBefore: [], imageUrls: [], textsAfter: [] };
  let seenText = false;
  let lastSceneImageIndexes: number[] = [];
  let postDividerTexts: string[] = [];
  let capturePostDivider = false;

  const flushScene = () => {
    if (!scene.imageUrls.length) return;

    const context = [...scene.textsBefore, ...scene.textsAfter];
    const startIndex = gallery.length;

    for (const url of scene.imageUrls) {
      gallery.push(url);
      imageContext.push([...context]);
    }

    lastSceneImageIndexes = Array.from(
      { length: scene.imageUrls.length },
      (_, i) => startIndex + i,
    );

    capturePostDivider = context.length === 0;
  };

  const attachPostDividerTexts = () => {
    if (!postDividerTexts.length || !lastSceneImageIndexes.length) return;

    for (const index of lastSceneImageIndexes) {
      imageContext[index] = [...imageContext[index], ...postDividerTexts];
    }

    postDividerTexts = [];
  };

  for (const block of blocks) {
    if (block.type === "text") {
      const { text } = block;
      if (isSkipText(text)) continue;

      const kind = dividerKind(text);
      if (kind === "skip") {
        if (postDividerTexts.length) attachPostDividerTexts();
        capturePostDivider = false;
        continue;
      }

      if (kind === "soft" || kind === "hard") {
        flushScene();
        scene = { textsBefore: [], imageUrls: [], textsAfter: [] };
        continue;
      }

      if (!seenText && isPreamble(text)) preamble.push(text);

      seenText = true;
      orderedTexts.push(text);

      if (
        capturePostDivider &&
        scene.imageUrls.length === 0 &&
        scene.textsBefore.length === 0 &&
        lastSceneImageIndexes.length > 0
      ) {
        postDividerTexts.push(text);
        continue;
      }

      capturePostDivider = false;

      if (scene.imageUrls.length === 0) {
        scene.textsBefore.push(text);
      } else {
        scene.textsAfter.push(text);
      }
    } else {
      if (!seenText) continue;

      if (postDividerTexts.length) {
        attachPostDividerTexts();
      }

      capturePostDivider = false;
      scene.imageUrls.push(block.url);
    }
  }

  flushScene();
  attachPostDividerTexts();

  if (leadingCount > 0) {
    const intro = getIntroForLeadingImages(blocks, leadingCount);

    for (let i = leadingCount - 1; i >= 0; i -= 1) {
      const url = (blocks[i] as { type: "image"; url: string }).url;
      gallery.unshift(url);
      imageContext.unshift([...intro]);
    }
  }

  appendTrailingTexts(blocks, gallery, imageContext);

  return {
    gallery,
    texts: orderedTexts,
    preamble: [...new Set(preamble)],
    imageContext,
  };
}

export { isSkipText, isPreamble, dividerKind };
