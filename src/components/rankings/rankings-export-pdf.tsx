"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal, flushSync } from "react-dom";
import { toast } from "sonner";
import { getRankCertificatesBulk } from "@/actions/rankings";
import { CertificateDocument } from "@/components/rankings/certificate-document";
import { CertificateStyles } from "@/components/rankings/certificate-styles";
import { useGlobalLoading } from "@/components/providers/global-loading-provider";
import { Button } from "@/components/ui/button";
import type {
  RankCertificateData,
  RankCertificateRequest,
} from "@/lib/rankings/certificate-types";
import {
  buildCertificatesPdfFilename,
  exportCertificateElementsToPdf,
  type ExportPdfProgress,
} from "@/lib/rankings/export-certificates-pdf";
import { getCertificateTemplateDataUrl } from "@/lib/rankings/certificate-template-data-url";
import {
  RANK_CATEGORY_LABELS,
  type RankCategory,
} from "@/lib/rankings/rank-categories";

type RankingsExportPdfProps = {
  requests: RankCertificateRequest[];
  schoolName: string;
  categoryFilter: RankCategory;
  gradeFilter: string;
  sectionFilter: string;
};

const INITIAL_PROGRESS: ExportPdfProgress = {
  phase: "loading",
  percent: 0,
  message: "Starting export…",
};

export function RankingsExportPdf({
  requests,
  schoolName,
  categoryFilter,
  gradeFilter,
  sectionFilter,
}: RankingsExportPdfProps) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<ExportPdfProgress>(INITIAL_PROGRESS);
  const [renderBatch, setRenderBatch] = useState<RankCertificateData[] | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const { stopLoading } = useGlobalLoading();

  useEffect(() => {
    if (!open) return;
    stopLoading();
    const interval = window.setInterval(stopLoading, 100);
    return () => window.clearInterval(interval);
  }, [open, stopLoading]);

  function closeModal() {
    setOpen(false);
    setRenderBatch(null);
    setProgress(INITIAL_PROGRESS);
  }

  async function handleExport() {
    if (requests.length === 0) {
      toast.error("No certificates match the current filters.");
      return;
    }

    setOpen(true);
    setProgress({
      phase: "loading",
      percent: 5,
      message: "Loading certificate data…",
    });

    try {
      const [certificates] = await Promise.all([
        getRankCertificatesBulk(requests),
        getCertificateTemplateDataUrl(),
      ]);
      if (certificates.length === 0) {
        throw new Error("Could not load certificate data.");
      }

      setProgress({
        phase: "rendering",
        percent: 15,
        message: `Rendering ${certificates.length} certificate(s)…`,
      });

      flushSync(() => {
        setRenderBatch(certificates);
      });

      const container = await new Promise<HTMLDivElement>((resolve, reject) => {
        const started = performance.now();
        const poll = () => {
          if (containerRef.current) {
            resolve(containerRef.current);
            return;
          }
          if (performance.now() - started > 10_000) {
            reject(new Error("Timed out preparing certificates"));
            return;
          }
          requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      });

      const filename = buildCertificatesPdfFilename({
        schoolName,
        category: RANK_CATEGORY_LABELS[categoryFilter],
        grade: gradeFilter,
        section: sectionFilter,
      });

      const count = await exportCertificateElementsToPdf(
        container,
        certificates.length,
        filename,
        setProgress
      );

      toast.success(`Downloaded ${count} certificate(s) as PDF.`);
      setTimeout(closeModal, 600);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF export failed");
      closeModal();
    }
  }

  const busy = open && progress.percent < 100;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={open || requests.length === 0}
        onClick={handleExport}
      >
        Export PDF
      </Button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="certificate-export-title"
              className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
            >
              <h2 id="certificate-export-title" className="text-lg font-semibold">
                Exporting certificates
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {progress.message}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">
                {progress.percent}%
              </p>
              {!busy && progress.percent === 100 ? (
                <div className="mt-4 flex justify-end">
                  <Button type="button" size="sm" onClick={closeModal}>
                    Close
                  </Button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body
        )}

      {renderBatch &&
        createPortal(
          <div
            ref={containerRef}
            aria-hidden
            className="certificate-export-root"
            style={{
              position: "fixed",
              top: 0,
              left: -10000,
              pointerEvents: "none",
              background: "#ffffff",
              color: "#111827",
            }}
          >
            <CertificateStyles />
            <div className="certificate-export-batch">
              {renderBatch.map((data, index) => (
                <CertificateDocument
                  key={`${data.category}-${data.studentName}-${index}`}
                  data={data}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
