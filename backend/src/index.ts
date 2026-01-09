import express from "express";
import cors from "cors";
import {
  extractFactsFromText,
  transformToFrontendFormat,
} from "./services/ai.service";

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

    console.log("=== SENDING TO FRONTEND ===");
    console.log(JSON.stringify(frontendData, null, 2));
    console.log("===========================");
    res.json(frontendData);
  } catch (err: any) {
    console.error("AI extraction failed:", err);

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
