/** Normalize login identifiers: lowercase, strip legacy @fwis.org suffix. */
export function toLoginUserId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/@fwis\.org$/i, "");
}

/** Valid login user id: letters, digits, dots, underscores, hyphens. */
export const LOGIN_USER_ID_REGEX = /^[a-z0-9._-]{2,64}$/;
