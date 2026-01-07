import { Router } from "express";
import {
  extractFactsFromText,
  transformToFrontendFormat,
} from "../services/ai.service.js";

const router = Router();

/**
 * Main extraction endpoint - matches frontend expectation
 * POST /extract
 * Body: { text: string, messageId?: string }
 * Returns: { interests, importantDates, places, notes }
 */
router.post("/extract", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    // Get AI extraction result
    const aiResult = await extractFactsFromText(text);

    // Transform to frontend-ready format
    const frontendData = transformToFrontendFormat(aiResult);

    // Return frontend-ready format with guaranteed arrays
    res.json(frontendData);
  } catch (err: any) {
    console.error("Extraction error:", err);

    // Return safe empty response on error to prevent frontend crashes
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