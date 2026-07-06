import type { RankCertificateData } from "@/lib/rankings/certificate-types";
import { CertificateRankDescription } from "@/components/rankings/certificate-rank-description";
import { CERTIFICATE_TEMPLATE_SRC } from "@/lib/rankings/certificate-template";

type CertificateDocumentProps = {
  data: RankCertificateData;
};

/** Print-friendly certificate using the school image template. */
export function CertificateDocument({ data }: CertificateDocumentProps) {
  return (
    <article className="certificate-sheet">
      <div className="certificate-frame">
        <img
          src={CERTIFICATE_TEMPLATE_SRC}
          alt=""
          className="certificate-background"
          draggable={false}
        />
        <div className="certificate-overlay" aria-hidden>
          <p className="certificate-field certificate-student-name">
            {data.studentName}
          </p>
          <p className="certificate-field certificate-rank-description">
            <CertificateRankDescription parts={data.rankDescription} />
          </p>
          <p className="certificate-field certificate-rank-category">
            OF {data.rankCategoryTitle}
          </p>
          <p className="certificate-field certificate-campus">
            {data.campusLabel}
          </p>
          <p className="certificate-field certificate-graduation-date">
            {data.graduationDate}
          </p>
        </div>
      </div>
    </article>
  );
}
