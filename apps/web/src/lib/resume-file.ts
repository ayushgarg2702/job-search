import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

export const RESUME_DIR = path.join(DATA_DIR, "resume");

export async function readResumeText(file: File): Promise<{ text: string; savedAs: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase();
  mkdirSync(RESUME_DIR, { recursive: true });
  const savedAs = path.join(RESUME_DIR, `original${ext}`);
  writeFileSync(savedAs, buf);

  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: false });
    return { text: (Array.isArray(text) ? text.join("\n") : text).trim(), savedAs };
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { text: value.trim(), savedAs };
  }
  if (ext === ".txt" || ext === ".md") return { text: buf.toString("utf8").trim(), savedAs };
  throw new Error("Upload a PDF, DOCX or TXT file.");
}
