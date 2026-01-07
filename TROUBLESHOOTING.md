# Troubleshooting Guide

## Issue: "AI extraction failed" / Empty Arrays Returned

### Symptom
When you submit text for extraction, you get back empty arrays:
```json
{
  "error": "AI extraction failed",
  "message": "Ollama is not running...",
  "interests": [],
  "importantDates": [],
  "places": [],
  "notes": []
}
```

### Root Cause
The backend requires **Ollama** (a local AI runtime) to be installed and running with the **deepseek-r1:1.5b** model.

### Solution

#### Step 1: Check if Ollama is Running

```bash
curl http://localhost:11434
```

**Expected response:** `Ollama is running`

**If connection refused:** Ollama is not running.

---

#### Step 2: Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com)

**Verify installation:**
```bash
ollama --version
```

---

#### Step 3: Start Ollama

**Option A: Run in terminal (foreground)**
```bash
ollama serve
```
Keep this terminal open while using the app.

**Option B: Run as background service**

**macOS/Linux:**
```bash
ollama serve &
```

**Windows:**
Ollama runs as a service automatically after installation.

---

#### Step 4: Pull the DeepSeek Model

```bash
ollama pull deepseek-r1:1.5b
```

This downloads the AI model (about 900MB). Wait for it to complete.

**Verify model is available:**
```bash
ollama list
```

You should see `deepseek-r1:1.5b` in the list.

---

#### Step 5: Restart Backend

```bash
cd backend
npm start
```

**You should see:**
```
🚀 Server running on port 5000
📡 Extraction endpoint: POST http://localhost:5000/extract

✅ Ollama is running and ready
```

If you still see `⚠️ WARNING: Ollama is not running!`, go back to Step 3.

---

## Quick Test

Once Ollama is running, test the extraction endpoint:

```bash
curl -X POST http://localhost:5000/extract \
  -H "Content-Type: application/json" \
  -d '{"text":"I like sushi and my birthday is April 5"}'
```

**Expected response:**
```json
{
  "interests": [{"value": "sushi"}],
  "importantDates": [{"value": "April 5"}],
  "places": [],
  "notes": []
}
```

---

## Other Common Issues

### Issue: Port 11434 Already in Use

**Symptom:** `Error: bind: address already in use`

**Solution:** Another instance of Ollama is already running. Kill it first:
```bash
pkill -f ollama
ollama serve
```

---

### Issue: Model Not Found

**Symptom:** `Error: model 'deepseek-r1:1.5b' not found`

**Solution:** Pull the model again:
```bash
ollama pull deepseek-r1:1.5b
```

---

### Issue: Backend Won't Start

**Symptom:** `Cannot find module...` or TypeScript errors

**Solution:** Rebuild the backend:
```bash
cd backend
npm install
npm run build
npm start
```

---

### Issue: Frontend Shows "Failed to fetch"

**Symptom:** Browser console shows network error

**Possible causes:**
1. Backend is not running
2. Backend is running on wrong port
3. CORS issue

**Solution:**
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Check that backend shows: `Server running on port 5000`
Check that frontend shows: `Local: http://localhost:5173`

---

## Still Not Working?

### Check the Logs

**Backend logs:**
Look at the terminal where you ran `npm start`

**Common errors:**
- `ECONNREFUSED` → Ollama not running
- `Model not found` → Need to pull model
- `TypeError: Cannot read property 'map'` → Contact maintainer (this should be fixed)

---

## Summary: Complete Setup Checklist

- [ ] Ollama installed (`ollama --version` works)
- [ ] Ollama running (`curl http://localhost:11434` succeeds)
- [ ] Model downloaded (`ollama list` shows deepseek-r1:1.5b)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Backend built (`npm run build`)
- [ ] Backend running (`npm start` shows "Ollama is running and ready")
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Frontend running (`npm run dev`)
- [ ] Browser open to http://localhost:5173

Once all checkboxes are complete, AI extraction should work!

---

## Alternative: Using a Different AI Model

If you want to use a different model:

1. Edit `backend/src/services/ai.service.ts`
2. Change `model: "deepseek-r1:1.5b"` to your preferred model
3. Pull that model: `ollama pull <model-name>`
4. Rebuild backend: `npm run build`
5. Restart backend: `npm start`

**Recommended models:**
- `deepseek-r1:1.5b` (fast, 900MB)
- `llama3.2:3b` (balanced, 2GB)
- `llama3.1:8b` (powerful, 4.7GB)
