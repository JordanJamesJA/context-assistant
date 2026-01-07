# Context Assistant

**Context Assistant** is a dynamic, responsive web application built with **React, TypeScript, Tailwind CSS, and Node/Express**. It helps users track and organize information from conversations with multiple people, automatically categorizing messages into **Interests, Important Dates, Places, and Notes**.

---

## Features

- **Dynamic People Management**
  - Add or remove people on the fly
  - Each person has their own contextual information

- **Intelligent Message Extraction**
  - Categorizes messages automatically into Interests, Important Dates, Places, and Notes
  - Tracks source, speaker, and timestamp for scalability

- **Editable Lists**
  - Inline editing with save/cancel actions
  - Delete items with a single click
  - Collapsible sections for a clean interface

- **Polished UI/UX**
  - ChatGPT-style sidebar with a hamburger menu
  - Swipe-to-open sidebar on mobile devices
  - Responsive layout across desktop, tablet, and mobile
  - Smooth transitions, hover effects, and minimal scrollbars

- **Conversation Input**
  - Auto-resizing textarea
  - Keyboard shortcuts (Enter to submit, Shift+Enter for new line)
  - Supports multi-sentence input

- **Professional Design System**
  - Tailwind CSS v4 for consistent spacing, typography, and colors
  - Clean gray and indigo color palette
  - Layered shadows and subtle borders for modern design

- **Backend**
  - Node + Express API for processing conversation data
  - Simplified and maintainable structure
  - Fully decoupled from frontend for flexibility

---

## Prerequisites

### Ollama Setup (Required for AI Extraction)

The backend uses **Ollama** with the **DeepSeek-R1:1.5b** model for intelligent message extraction.

1. **Install Ollama:**
   - macOS/Linux: `curl -fsSL https://ollama.com/install.sh | sh`
   - Windows: Download from [ollama.com](https://ollama.com)

2. **Start Ollama:**
   ```bash
   ollama serve
   ```

3. **Pull the DeepSeek model:**
   ```bash
   ollama pull deepseek-r1:1.5b
   ```

4. **Verify it's running:**
   ```bash
   curl http://localhost:11434
   ```
   You should see: `Ollama is running`

---

## Installation

### Backend

```bash
cd backend
npm install
npm run build
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running the App

### Start Backend (Terminal 1)

Make sure Ollama is running first!

```bash
cd backend
npm start
# or for development with auto-reload:
# npm run dev
```

You should see:
```
🚀 Server running on port 5000
📡 Extraction endpoint: POST http://localhost:5000/extract
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Usage

Open the app in a browser.

Use the sidebar to add or select a person.

Type a message in the conversation input:

Messages are automatically categorized into Interests, Important Dates, Places, or Notes.

Edit or remove any extracted items directly in the Person Details view.

On mobile:

Use the hamburger menu to toggle the sidebar.

Swipe right from the left edge to open the sidebar.

Technologies Used

Frontend

React + TypeScript

Tailwind CSS v4

Lucide React icons

Backend

Node.js + Express

CORS

JSON-based API endpoints

Future Improvements

AI-assisted intelligent extraction for longer messages or multi-speaker conversations

File upload and image-based text extraction

Persistent database storage

Advanced analytics for conversation trends
