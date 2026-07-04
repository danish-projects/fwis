const CERTIFICATE_TEMPLATE_PATH = "/certificates/rank-certificate-template.png";

let templateDataUrlPromise: Promise<string> | null = null;

export function getCertificateTemplateDataUrl(): Promise<string> {
  if (!templateDataUrlPromise) {
    templateDataUrlPromise = fetch(CERTIFICATE_TEMPLATE_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load certificate template image");
        }
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () =>
              reject(new Error("Could not read certificate template image"));
            reader.readAsDataURL(blob);
          })
      );
  }
  return templateDataUrlPromise;
}
