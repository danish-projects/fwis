"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkGenerateCalendarDays } from "@/actions/calendar";
import { Button } from "@/components/ui/button";

type CalendarBulkGenerateProps = {
  academicYearId: string;
};

export function CalendarBulkGenerate({ academicYearId }: CalendarBulkGenerateProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await bulkGenerateCalendarDays(academicYearId);
        toast.success(
          `Generated ${result.created} day(s)${result.skipped ? ` (${result.skipped} already existed)` : ""}`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Generation failed");
      }
    });
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={handleGenerate}>
      {pending ? "Generating..." : "Generate Sundays"}
    </Button>
  );
}
