import { createSign } from "node:crypto";
import type { GoogleDriveServiceAccount } from "@/lib/google-drive/config";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(account: GoogleDriveServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: account.clientEmail,
      scope: DRIVE_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.privateKey);

  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export async function getGoogleDriveAccessToken(
  account: GoogleDriveServiceAccount
): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const assertion = signJwt(account);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive auth failed: ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
};

type DriveListResponse = {
  files?: DriveFile[];
};

async function driveListAllFiles(
  accessToken: string,
  query: string
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,mimeType)",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Drive list failed: ${text}`);
    }

    const data = (await response.json()) as DriveListResponse & {
      nextPageToken?: string;
    };
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

async function driveListFiles(
  accessToken: string,
  query: string
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,mimeType)",
    pageSize: "25",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive list failed: ${text}`);
  }

  const data = (await response.json()) as DriveListResponse;
  return data.files ?? [];
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export async function findDriveFolderByName(
  accessToken: string,
  parentFolderId: string,
  folderName: string
): Promise<DriveFile | null> {
  const query = [
    `'${escapeDriveQueryValue(parentFolderId)}' in parents`,
    "mimeType='application/vnd.google-apps.folder'",
    `name='${escapeDriveQueryValue(folderName)}'`,
    "trashed=false",
  ].join(" and ");

  const files = await driveListFiles(accessToken, query);
  return files[0] ?? null;
}

export async function listDrivePdfFiles(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const query = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    "(mimeType='application/pdf' or mimeType='application/vnd.google-apps.document')",
    "trashed=false",
  ].join(" and ");

  return driveListAllFiles(accessToken, query);
}

export async function listDriveFilesInFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const query = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    "trashed=false",
  ].join(" and ");

  return driveListAllFiles(accessToken, query);
}

export async function findDriveFileByNameInFolder(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<DriveFile | null> {
  const escapedName = escapeDriveQueryValue(fileName);
  const query = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    `name='${escapedName}'`,
    "(mimeType='application/pdf' or mimeType='application/vnd.google-apps.document')",
    "trashed=false",
  ].join(" and ");

  const files = await driveListAllFiles(accessToken, query);
  return files[0] ?? null;
}

export async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive download failed: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function exportDriveGoogleDocAsPdf(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive export failed: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
