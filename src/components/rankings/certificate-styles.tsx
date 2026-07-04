/** Shared screen + print styles for image-based certificates. */
export function CertificateStyles() {
  return (
    <style>{`
      @import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&family=Source+Sans+3:wght@500;600;700&display=swap");

      .certificate-export-root {
        background: #ffffff;
        color: #111827;
      }
      .certificate-page {
        min-height: 100vh;
        background: #e5e7eb;
        padding: 1.5rem;
      }
      .certificate-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
        margin-bottom: 1.25rem;
      }
      .certificate-toolbar button,
      .certificate-toolbar a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 2.5rem;
        padding: 0 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        text-decoration: none;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #111827;
        cursor: pointer;
      }
      .certificate-toolbar button.primary {
        background: #0f766e;
        border-color: #0f766e;
        color: #fff;
      }
      .certificate-sheet {
        width: 11in;
        max-width: 100%;
        margin: 0 auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      }
      .certificate-frame {
        position: relative;
        width: 100%;
        aspect-ratio: 11 / 8.5;
        overflow: hidden;
        background: #fff;
      }
      .certificate-background {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .certificate-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .certificate-field {
        position: absolute;
        margin: 0;
        text-align: center;
        color: #1e3a5f;
        line-height: 1.2;
      }
      .certificate-student-name {
        top: 43%;
        left: 50%;
        transform: translateX(-50%);
        font-family: "Great Vibes", "Segoe Script", cursive;
        font-size: clamp(1.85rem, 3.5vw, 5.35rem);
        font-weight: 400;
        color: #1e3a5f;
        max-width: 72%;
        white-space: nowrap;
        text-overflow: ellipsis;
        -webkit-font-smoothing: antialiased;
      }
      .certificate-rank-description {
        top: 54%;
        left: 50%;
        transform: translateX(-50%);
        font-family: "Cormorant Garamond", "Times New Roman", Georgia, serif;
        font-size: clamp(0.82rem, 1.2vw, 1.05rem);
        font-weight: 400;
        font-style: italic;
        color: #1a1a1a;
        max-width: 70%;
        line-height: 1.65;
        letter-spacing: 0.01em;
      }
      .certificate-description-emphasis {
        font-family: "Cormorant Garamond", "Times New Roman", Georgia, serif;
        font-style: normal;
        font-weight: 700;
        font-size: 1.14em;
        letter-spacing: 0.02em;
        color: #111827;
      }
      .certificate-rank-category {
        top: 22.8%;
        left: 50%;
        transform: translateX(-50%);
        font-family: "Cinzel", "Times New Roman", Georgia, serif;
        font-size: clamp(1.1rem, 1.55vw, 1.65rem);
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #1e3a5f;
        white-space: nowrap;
      }
      .certificate-campus {
        top: 77.5%;
        left: 28%;
        transform: translateX(-50%);
        font-family: "Source Sans 3", Arial, Helvetica, sans-serif;
        font-size: clamp(0.62rem, 0.95vw, 1.5rem);
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #111827;
        white-space: nowrap;
      }
      .certificate-graduation-date {
        top: 77.5%;
        left: 70%;
        transform: translateX(-50%);
        font-family: "Source Sans 3", Arial, Helvetica, sans-serif;
        font-size: clamp(0.62rem, 0.95vw, 1.5rem);
        font-weight: 600;
        letter-spacing: 0.03em;
        color: #111827;
        white-space: nowrap;
      }

      .certificate-export-batch .certificate-sheet {
        width: 1056px;
        height: 816px;
        max-width: none;
        margin: 0 auto 1.5rem;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }
      .certificate-export-batch .certificate-frame {
        width: 1056px;
        height: 816px;
        aspect-ratio: auto;
      }

      @media print {
        .certificate-export-batch .certificate-sheet {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
          break-after: page;
        }
        .certificate-export-batch .certificate-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        @page {
          size: letter landscape;
          margin: 0;
        }
        aside,
        .certificate-toolbar,
        header,
        nav {
          display: none !important;
        }
        main {
          padding: 0 !important;
          margin: 0 !important;
          max-width: none !important;
        }
        .certificate-page {
          background: #fff;
          padding: 0;
          min-height: auto;
        }
        .certificate-sheet {
          width: 100%;
          max-width: none;
          box-shadow: none;
        }
        .certificate-frame {
          aspect-ratio: auto;
          height: 8.5in;
        }
        .certificate-student-name {
          font-size: 3.1rem;
        }
        .certificate-rank-description {
          font-size: 1.02rem;
        }
        .certificate-description-emphasis {
          font-size: 1.14em;
        }
        .certificate-rank-category {
          font-size: 1.45rem;
        }
        .certificate-campus {
          font-size: 0.82rem;
        }
        .certificate-graduation-date {
          font-size: 0.88rem;
        }
      }
    `}</style>
  );
}
