export type GoogleDriveServiceAccount = {
  clientEmail: string;
  privateKey: string;
};

export function getGoogleDriveServiceAccount(): GoogleDriveServiceAccount | null {
  const json = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {
      return null;
    }
  }

  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  if (!clientEmail || !privateKey) return null;

  return { clientEmail, privateKey };
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveServiceAccount() !== null;
}

/** Parent FWIS Docs folder that contains one subfolder per academic year name. */
export function getFwisDocsParentFolderId(): string | null {
  const value = process.env.GOOGLE_DRIVE_FWIS_DOCS_FOLDER_ID?.trim();
  return value || null;
}

export function isLessonPlanDriveConfigured(): boolean {
  return isGoogleDriveConfigured() && Boolean(getFwisDocsParentFolderId());
}
