import "server-only";
import { marked } from "marked";

/** Plain, ATS-friendly single-column resume. Printed to PDF by the browser worker. */
export function resumeHtml(markdown: string): string {
  const body = marked.parse(markdown, { async: false }) as string;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Resume</title><style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; line-height: 1.38; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 2pt; }
  h1 + p { margin: 0 0 10pt; color: #333; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #999; padding-bottom: 2pt; margin: 12pt 0 6pt; }
  h3 { font-size: 10.5pt; margin: 8pt 0 0; }
  h3 + p { margin: 0; color: #444; font-size: 9.5pt; }
  ul { margin: 3pt 0 0; padding-left: 14pt; }
  li { margin: 1.5pt 0; }
  p { margin: 3pt 0; }
  a { color: inherit; text-decoration: none; }
  </style></head><body>${body}</body></html>`;
}
