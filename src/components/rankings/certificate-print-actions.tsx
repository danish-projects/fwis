"use client";

import Link from "next/link";

export function CertificatePrintActions() {
  return (
    <div className="certificate-toolbar">
      <button type="button" className="primary" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <Link href="/rankings">Back to rankings</Link>
    </div>
  );
}
