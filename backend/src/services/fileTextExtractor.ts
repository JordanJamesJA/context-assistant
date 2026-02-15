import mammoth from "mammoth";

export type SupportedFileType = "pdf" | "docx" | "text";

export function detectFileType(
  mime: string,
  filename: string,
): SupportedFileType | null {
  const lower = filename.toLowerCase();

  if (mime === "text/plain" || lower.endsWith(".txt") || lower.endsWith(".md"))
    return "text";
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

export async function extractTextFromBuffer(
  type: SupportedFileType,
  buf: Buffer,
): Promise<string> {
  if (type === "text") return buf.toString("utf8").trim();

  if (type === "pdf") {
    const mod = await import("pdf-parse");
    const pdfParse = (mod as any).default ?? (mod as any);
    const data = await pdfParse(buf);
    return (data?.text || "").trim();
  }

  // docx
  const result = await mammoth.extractRawText({ buffer: buf });
  return (result.value || "").trim();
}

export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
