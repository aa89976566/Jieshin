const CDN_QUALITY_SUFFIX = "/w=3840,quality=95,fit=scale-down";

export function highResImageUrl(url: string): string {
  if (url.includes("images.spr.so") && url.endsWith("/public")) {
    return url.replace("/public", CDN_QUALITY_SUFFIX);
  }
  return url;
}
