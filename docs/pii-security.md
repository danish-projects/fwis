# PII security

FWIS stores student and parent sensitive data. This document describes how it is protected.

## Fields encrypted at rest

These columns are stored as **AES-256-GCM** ciphertext in PostgreSQL:

- Date of birth
- Email address
- Street address, city, state/province, zip/postal code, country
- Father / mother guardian names and mobile/WhatsApp numbers
- Emergency contact

Lookup hashes (HMAC-SHA256, not reversible) support duplicate detection:

- `date_of_birth_hash`
- `father_mobile_whatsapp_hash`
- `mother_mobile_whatsapp_hash`

First name, last name, gender, and student number remain plaintext for sorting and display.

## Setup

1. Generate an encryption key:

   ```bash
   openssl rand -base64 32
   ```

2. Add to `.env.local` and production env files (`.env.stage`, `.env.prod`):

   ```env
   PII_ENCRYPTION_KEY=your-base64-key-here
   ```

3. Apply migrations and encrypt existing rows:

   ```bash
   npm run db:deploy
   npm run db:encrypt-pii
   ```

**Production will fail to encrypt/decrypt** if `PII_ENCRYPTION_KEY` is missing.

## Key rotation

1. Decrypt all rows with the old key (custom script or DB restore).
2. Set the new `PII_ENCRYPTION_KEY`.
3. Run `npm run db:encrypt-pii` again.

There is no built-in multi-key rotation yet — plan maintenance windows for key changes.

## In transit

- Browser traffic: HTTPS + HSTS (production)
- Database: TLS to SmarterASP PostgreSQL
- Email (Resend): HTTPS

## Access control

- PII decrypted only in authorized server actions after RBAC checks
- Audit logs strip parent contact fields
- CSV export requires `reports:export` (not available to Read Only role)
- Encrypted columns cannot be searched by parent phone/email in the UI (search uses name and student ID)

## What this does not provide

- End-to-end encryption (staff with DB + key access can decrypt)
- Encryption of school or teacher records
- Field-level encryption in CSV exports (exports are plaintext for authorized admins)
