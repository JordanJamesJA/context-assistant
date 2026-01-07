import { Router } from "express";
import { extractFactsFromText } from "../services/ai.service.js";

const router = Router();

router.post("/extract-facts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  try {
    const aiResult = await extractFactsFromText(text);
    res.json(aiResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;