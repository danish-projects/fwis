/** L1 BDD tests use mock data only — no database or network. */
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";
env.FWIS_PII_ENCRYPTION_KEY ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
