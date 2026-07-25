"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type MatrixExportButtonProps = {
  exportUrl: string;
  label?: string;
  disabled?: boolean;
};

async function downloadExportFile(exportUrl: string) {
  const response = await fetch(exportUrl);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Export failed");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match?.[1] ?? "export.xlsx";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function MatrixExportButton({
  exportUrl,
  label = "Export Excel",
  disabled = false,
}: MatrixExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadExportFile(exportUrl);
      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
      {isExporting ? "Exporting…" : label}
    </Button>
  );
}
