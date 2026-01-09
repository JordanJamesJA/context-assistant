import { Router } from "express";
import {
  extractFactsFromText,
  transformToFrontendFormat,
} from "../services/ai.service.js";

const router = Router();
router.post("/extract", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    const aiResult = await extractFactsFromText(text);
    const frontendData = transformToFrontendFormat(aiResult, text);
    res.json(frontendData);
  } catch (err: any) {
    console.error("Extraction error:", err);
    res.status(500).json({
      error: err.message || "Failed to extract facts",
      interests: [],
      importantDates: [],
      places: [],
      notes: [],
    });
  }
});

export default router;
