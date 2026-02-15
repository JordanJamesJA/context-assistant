import { Router } from "express";
import multer from "multer";
import {
  detectFileType,
  extractTextFromBuffer,
  normalizeExtractedText,
} from "../services/fileTextExtractor.js";
import { extractFactsFromText } from "../services/ai.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

export const extractRouter = Router();

// POST /api/extract/text
// form-data: file=<upload>
extractRouter.post("/extract/text", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ error: "No file uploaded. Use form-data key 'file'." });

    const type = detectFileType(file.mimetype, file.originalname);
    if (!type)
      return res
        .status(415)
        .json({ error: "Unsupported file type. Use .txt, .pdf, or .docx" });

    const rawText = await extractTextFromBuffer(type, file.buffer);
    const text = normalizeExtractedText(rawText);

    if (!text)
      return res
        .status(400)
        .json({ error: "No extractable text found in file." });

    // cap for safety (adjust as needed)
    const capped = text.length > 12000 ? text.slice(0, 12000) : text;

    return res.json({
      type,
      extracted_text_length: capped.length,
      extracted_text_preview: capped.slice(0, 500),
      text: capped, 
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to extract text",
      details: err?.message ?? String(err),
    });
  }
});

// POST /api/extract/facts
// form-data: file=<upload>
extractRouter.post("/extract/facts", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ error: "No file uploaded. Use form-data key 'file'." });

    const type = detectFileType(file.mimetype, file.originalname);
    if (!type)
      return res
        .status(415)
        .json({ error: "Unsupported file type. Use .txt, .pdf, or .docx" });

    const rawText = await extractTextFromBuffer(type, file.buffer);
    const text = normalizeExtractedText(rawText);

    if (!text)
      return res
        .status(400)
        .json({ error: "No extractable text found in file." });

    const capped = text.length > 12000 ? text.slice(0, 12000) : text;

    const aiResult = await extractFactsFromText(capped);

    return res.json({
      type,
      extracted_text_length: capped.length,
      extracted_text_preview: capped.slice(0, 500),
      ai_result: aiResult,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Failed to extract facts",
      details: err?.message ?? String(err),
    });
  }
});
