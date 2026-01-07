import express from "express";
import cors from "cors";
import {
  extractFactsFromText,
  transformToFrontendFormat,
  checkOllamaAvailability
} from "./services/ai.service.js";

interface ExtractRequest {
  text: string;
  messageId?: string;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/ping", (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main extraction endpoint
 * Transforms AI output into frontend-ready format
 * Returns: { interests, importantDates, places, notes }
 */
app.post("/extract", async (req, res) => {
  const { text } = req.body as ExtractRequest;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "ValidationError",
      message: "Missing or invalid 'text' field in request body",
      // Return safe empty arrays even on validation error
      interests: [],
      importantDates: [],
      places: [],
      notes: [],
    });
  }

  try {
    // Get AI extraction result
    const aiResult = await extractFactsFromText(text);

    // Transform to frontend-ready format with guaranteed arrays
    const frontendData = transformToFrontendFormat(aiResult);

    res.json(frontendData);
  } catch (err: any) {
    console.error("AI extraction failed:", err);

    // Return safe empty response on error to prevent frontend crashes
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
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Extraction endpoint: POST http://localhost:${PORT}/extract`);
  console.log("");

  // Check Ollama availability on startup
  const ollamaStatus = await checkOllamaAvailability();
  if (ollamaStatus.available) {
    console.log("✅ Ollama is running and ready");
  } else {
    console.log("⚠️  WARNING: Ollama is not running!");
    console.log(`   ${ollamaStatus.message}`);
    console.log("");
    console.log("   To fix this:");
    console.log("   1. Install Ollama: https://ollama.com");
    console.log("   2. Start Ollama: ollama serve");
    console.log("   3. Pull model: ollama pull deepseek-r1:1.5b");
    console.log("");
    console.log("   AI extraction will not work until Ollama is running.");
  }
});
