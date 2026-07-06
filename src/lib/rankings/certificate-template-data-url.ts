import {
  CERTIFICATE_TEMPLATE_SRC,
  getCertificateTemplateUrl,
} from "@/lib/rankings/certificate-template";

let templateDataUrlPromise: Promise<string> | null = null;

async function fetchTemplateAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(
      `Could not load certificate template image (${response.status} ${response.statusText})`
    );
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Could not read certificate template image"));
    reader.readAsDataURL(blob);
  });
}

export function getCertificateTemplateDataUrl(): Promise<string> {
  if (!templateDataUrlPromise) {
    templateDataUrlPromise = (async () => {
      const primaryUrl = getCertificateTemplateUrl();
      try {
        return await fetchTemplateAsDataUrl(primaryUrl);
      } catch (primaryError) {
        // Fallback for hosts that still serve the legacy public/ copy.
        if (typeof window !== "undefined") {
          const legacyUrl = new URL(
            "/certificates/rank-certificate-template.png",
            window.location.origin
          ).href;
          if (legacyUrl !== primaryUrl) {
            try {
              return await fetchTemplateAsDataUrl(legacyUrl);
            } catch {
              // use primary error below
            }
          }
        }
        throw primaryError instanceof Error
          ? primaryError
          : new Error("Could not load certificate template image");
      }
    })();
  }
  return templateDataUrlPromise;
}

/** Reset cached template (tests / retry after failed export). */
export function resetCertificateTemplateCache(): void {
  templateDataUrlPromise = null;
}

export { CERTIFICATE_TEMPLATE_SRC };
