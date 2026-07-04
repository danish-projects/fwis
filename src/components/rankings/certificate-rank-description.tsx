import type { ReactNode } from "react";
import type { RankDescriptionParts } from "@/lib/rankings/build-rank-description";

type CertificateRankDescriptionProps = {
  parts: RankDescriptionParts;
};

function Emphasis({ children }: { children: ReactNode }) {
  return <span className="certificate-description-emphasis">{children}</span>;
}

function AcademicTermSuffix({ term }: { term: string }) {
  return (
    <>
      <br />
      during the academic term <Emphasis>{term}</Emphasis>
    </>
  );
}

export function CertificateRankDescription({
  parts,
}: CertificateRankDescriptionProps) {
  if (parts.category === "achievement" && parts.positionLabel && parts.sectionGrade) {
    return (
      <>
        In recognition of securing <Emphasis>{parts.positionLabel}</Emphasis> in{" "}
        <Emphasis>{parts.sectionGrade}</Emphasis> at
        <br />
        <Emphasis>{parts.schoolName}</Emphasis>
        <AcademicTermSuffix term={parts.academicTerm} />
      </>
    );
  }

  if (parts.category === "attendance") {
    return (
      <>
        In recognition of achieving the perfect attendance at
        <br />
        <Emphasis>{parts.schoolName}</Emphasis>
        <AcademicTermSuffix term={parts.academicTerm} />
      </>
    );
  }

  if (parts.sectionGrade) {
    return (
      <>
        In recognition of successfully completing{" "}
        <Emphasis>{parts.sectionGrade}</Emphasis> of the
        <br />
        <Emphasis>{parts.schoolName}</Emphasis>
        <AcademicTermSuffix term={parts.academicTerm} />
      </>
    );
  }

  return null;
}
