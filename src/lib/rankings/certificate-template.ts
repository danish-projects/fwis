import certificateTemplateImage from "@/assets/rankings/rank-certificate-template.png";

/** Webpack-bundled URL (/_next/static/media/...) — reliable on standalone hosting. */
export const CERTIFICATE_TEMPLATE_SRC =
  typeof certificateTemplateImage === "string"
    ? certificateTemplateImage
    : certificateTemplateImage.src;

/** Absolute URL for fetch/Image in the browser. */
export function getCertificateTemplateUrl(): string {
  const src = CERTIFICATE_TEMPLATE_SRC;
  if (typeof window === "undefined") {
    return src;
  }
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  return new URL(src, window.location.origin).href;
}
