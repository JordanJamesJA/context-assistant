/**
 * Backend Express Server
 *
 * Provides API endpoint for AI-powered fact extraction from conversation text.
 *
 * Endpoints:
 * - GET /ping - Health check
 * - POST /extract - Extract facts from conversation text
 *
 * Technology:
 * - Express 5.2.1 for HTTP server
 * - Ollama for AI extraction (deepseek-r1:1.5b model)
 * - CORS enabled for frontend communication
 */

import express from "express";
import cors from "cors";
import {
  extractFactsFromText,
  transformToFrontendFormat,
} from "./services/ai.service";
import { extractRouter } from "./routes/extract.routes.js";

interface ExtractRequest {
  text: string;
  messageId?: string;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", extractRouter)

app.get("/ping", (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main extraction endpoint
 *
 * Receives conversation text, processes with AI, returns categorized facts.
 * Always returns valid structure (empty arrays on error) to prevent frontend crashes.
 */
app.post("/extract", async (req, res) => {
  const { text } = req.body as ExtractRequest;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "ValidationError",
      message: "Missing or invalid 'text' field in request body",
      interests: [],
      importantDates: [],
      places: [],
      notes: [],
    });
  }

  try {
    const aiResult = await extractFactsFromText(text);
    const frontendData = transformToFrontendFormat(aiResult, text);

    res.json(frontendData);
  } catch (err: any) {
    res.status(500).json({
      error: "AI extraction failed",
      message: err.message,
      interests: [],
      importantDates: [],
      places: [],
      notes: [],
    });
  }
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Extraction endpoint: POST http://localhost:${PORT}/extract`);
});
