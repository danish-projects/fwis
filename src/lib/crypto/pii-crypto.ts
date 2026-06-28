import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "enc:v1:";

let warnedDevKey = false;

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (trimmed.startsWith("base64:")) {
    return Buffer.from(trimmed.slice("base64:".length), "base64");
  }
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length !== 32) {
    throw new Error("PII_ENCRYPTION_KEY must decode to 32 bytes (use: openssl rand -base64 32)");
  }
  return buf;
}

export function getPiiEncryptionKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (raw) return decodeKey(raw);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PII_ENCRYPTION_KEY is required in production. Generate with: openssl rand -base64 32"
    );
  }

  if (!warnedDevKey) {
    console.warn(
      "[FWIS] PII_ENCRYPTION_KEY not set — using insecure dev-only key. Do not use in production."
    );
    warnedDevKey = true;
  }
  return Buffer.from("fwis-dev-only-pii-key-32bytes!!", "utf8");
}

function getLookupKey(): Buffer {
  return createHmac("sha256", getPiiEncryptionKey())
    .update("fwis-pii-lookup-v1")
    .digest();
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptPii(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getPiiEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]).toString("base64url");
  return `${PREFIX}${payload}`;
}

export function decryptPii(value: string): string {
  if (!isEncryptedValue(value)) return value;

  const key = getPiiEncryptionKey();
  const payload = Buffer.from(value.slice(PREFIX.length), "base64url");
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}

export function piiLookupHash(normalized: string): string {
  return createHmac("sha256", getLookupKey())
    .update(normalized)
    .digest("hex");
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
