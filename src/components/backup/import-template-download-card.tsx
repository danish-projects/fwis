"use client";

import { useState, useTransition } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function downloadImportTemplate() {
  const response = await fetch("/api/import/template");

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Template download failed");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match?.[1] ?? "fwis-school-data-import-template.xlsx";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ImportTemplateDownloadCard() {
  const [pending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      try {
        await downloadImportTemplate();
        toast.success("Import template downloaded.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Template download failed");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Import template
        </CardTitle>
        <CardDescription>
          Download a blank Excel workbook for importing staff and students.
          School, academic year, and app users must already exist. Then run{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run import:school</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sheets: Staff, Students. Teachers need grade + section; substitutes use
          gender only (like admins). Login{" "}
          <code className="text-xs">user_id</code> is derived automatically
          (e.g. <code className="text-xs">hou.b.g1</code>,{" "}
          <code className="text-xs">hou.m.sub</code>) and must already exist.
          Students enroll by <code className="text-xs">grade</code> +{" "}
          <code className="text-xs">section</code>.
        </p>
        <Button type="button" variant="outline" onClick={handleDownload} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download import template
        </Button>
      </CardContent>
    </Card>
  );
}
