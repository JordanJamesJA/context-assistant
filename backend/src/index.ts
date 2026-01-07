import express from "express";
import cors from "cors";
import { extractFactsFromText } from "./services/ai.service.ts"; 
import type { AIResult } from "./types/ai.types.js"; 

interface ExtractRequest {
  text: string;
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

// Extract endpoint now fully relies on AI
app.post("/extract", async (req, res) => {
  const { text } = req.body as ExtractRequest;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "ValidationError",
      message: "Missing or invalid 'text' field in request body",
    });
  }

  try {
    const aiResult: AIResult = await extractFactsFromText(text);
    res.json(aiResult);
  } catch (err: any) {
    res.status(500).json({ error: "AI extraction failed", message: err.message });
  }
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
