"use client";

import { useState, type ReactNode } from "react";
import { ClassroomSwitcher } from "@/components/teacher/teacher-class-switcher";
import {
  ClassroomContentLoadingOverlay,
  GradeChangeLoadingBanner,
} from "@/components/shared/grade-change-loading";

type ClassroomOption = {
  id: string;
  name: string;
};

type AssessmentsClassroomContentProps = {
  classroomId: string;
  classroomOptions: ClassroomOption[];
  basePath: "/assessments" | "/teacher/assessments" | "/transcript" | "/teacher/transcript";
  children: ReactNode;
};

export function AssessmentsClassroomContent({
  classroomId,
  classroomOptions,
  basePath,
  children,
}: AssessmentsClassroomContentProps) {
  const [isGradeLoading, setIsGradeLoading] = useState(false);

  return (
    <div className="space-y-4">
      {classroomOptions.length > 0 && (
        <ClassroomSwitcher
          classrooms={classroomOptions}
          currentClassroomId={classroomId}
          basePath={basePath}
          onPendingChange={setIsGradeLoading}
        />
      )}

      {isGradeLoading && <GradeChangeLoadingBanner />}

      <div className="relative">
        {isGradeLoading && <ClassroomContentLoadingOverlay />}
        {children}
      </div>
    </div>
  );
}
