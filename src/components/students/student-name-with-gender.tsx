import { Mars, Venus } from "lucide-react";
import { asGender, type GenderCode } from "@/lib/setup-types";
import { cn } from "@/lib/utils";

type StudentNameWithGenderProps = {
  name: string;
  gender: GenderCode | string;
  studentNumber?: string | null;
  className?: string;
  iconClassName?: string;
};

export function StudentNameWithGender({
  name,
  gender,
  studentNumber,
  className,
  iconClassName,
}: StudentNameWithGenderProps) {
  const code = asGender(gender);
  const isFemale = code === "FEMALE";
  const Icon = isFemale ? Venus : Mars;

  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      <span className="inline-flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-4 shrink-0",
            isFemale ? "text-pink-600 dark:text-pink-400" : "text-sky-600 dark:text-sky-400",
            iconClassName
          )}
          aria-hidden
        />
        <span>{name}</span>
        <span className="sr-only">{isFemale ? "Girl" : "Boy"}</span>
      </span>
      {studentNumber ? (
        <span className="font-mono text-xs text-muted-foreground">{studentNumber}</span>
      ) : null}
    </span>
  );
}
