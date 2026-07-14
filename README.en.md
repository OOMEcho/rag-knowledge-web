<div align="center">

# rag-knowledge-web

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vite.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.x-409eff.svg)](https://element-plus.org/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green.svg)](LICENSE)

[中文](README.md) | **English**

</div>

## 🌟 Introduction

rag-knowledge-web is the web frontend for the [rag-knowledge-system](https://github.com/OOMEcho/rag-knowledge-system) backend, providing knowledge base / document management and a streaming RAG chat interface. It follows a split frontend/backend architecture — the build output is pure static files deployable to any static server.

### ✨ Features

- 📚 **Knowledge base management**: list, search, create, edit, delete (with delete-protection hints)
- 📄 **Document management**: drag-and-drop upload (auto-triggers ingestion), live ingestion status polling, failed-ingestion retry, chunk preview, delete
- 💬 **RAG chat**: SSE typewriter streaming, markdown rendering, reference cards (document name / chunk index / fusion score), stop generation, copy answer
- 🔁 **Multi-turn conversations**: the frontend maintains chat history and sends it with each request; when the server rewrites a follow-up, an "interpreted as…" hint bar is shown
- 🔍 **Search-only mode**: inspect raw hybrid retrieval (vector + keyword RRF fusion) hits directly — great for debugging retrieval quality
- ⚙️ **Connection settings**: a settings dialog for the backend URL and API key (persisted in localStorage), takes effect without a refresh
- 🎛️ **Retrieval parameters**: topK and similarity threshold adjustable in the UI

## 🔗 Related Projects

- [Backend repository](https://github.com/OOMEcho/rag-knowledge-system) (Spring Boot 3 + Spring AI + Ollama + pgvector)

## 🏗️ Tech Stack

| Technology | Version | Purpose |
|------|------|------|
| Vue | 3.5 | Composition API |
| TypeScript | 6.0 | Type safety |
| Vite | 8.x | Build tool + dev proxy |
| Element Plus | 2.14 | UI component library (full import) |
| Pinia | 3.x | State management (connection settings) |
| Vue Router | 5.x | Hash-mode routing (no server-side fallback needed) |
| axios | 1.x | HTTP client (unwraps ApiResponse, injects X-API-Key) |
| markdown-it + DOMPurify | - | Answer rendering + XSS protection |

## 🚀 Quick Start

### Prerequisites

- 📦 Node.js 20+
- 🔙 A running backend (default `http://localhost:8080`, see the backend README)

### Local Development

```bash
git clone https://github.com/OOMEcho/rag-knowledge-web.git
cd rag-knowledge-web
npm install
npm run dev
```

Open `http://localhost:5173`. In dev mode Vite proxies `/api` and `/actuator` to the local backend (see `vite.config.ts`) — zero configuration required.

### Build & Deploy

```bash
npm run build
```

Host the `dist/` output with any static server (nginx, static hosting platforms, etc.). Two steps to connect it to the backend after deployment:

1. Fill in the backend URL (e.g. `http://192.168.1.10:8080`) and the API key (if the backend has auth enabled) in the Settings dialog (top-right)
2. Add the frontend origin to the backend CORS whitelist: `RAG_CORS_ALLOWED_ORIGINS=https://your-frontend-domain`

## 🏛️ Architecture

### Directory Structure

```
src/
├── api/
│   ├── http.ts               # axios wrapper: dynamic baseURL, X-API-Key injection, ApiResponse unwrapping
│   ├── sse.ts                # POST SSE client: hand-rolled fetch + ReadableStream parser
│   ├── knowledgeBase.ts      # Knowledge base APIs
│   ├── document.ts           # Document APIs
│   └── rag.ts                # Search / chat / streaming APIs
├── stores/
│   └── settings.ts           # Connection settings (persisted in localStorage)
├── types/
│   └── api.ts                # Types mirroring backend DTOs (all IDs are strings)
├── views/
│   ├── KnowledgeBaseView.vue # Knowledge base management
│   ├── DocumentView.vue      # Document management (upload / polling / chunk drawer)
│   └── ChatView.vue          # Chat (SSE streaming + search-only tab)
├── components/
│   ├── ReferenceList.vue     # Collapsible reference list
│   ├── DocumentStatusTag.vue # Ingestion status badge
│   └── SettingsDialog.vue    # Connection settings dialog
└── router/                   # Hash-mode routes
```

### Routes

| Route | Page |
|------|------|
| `/#/kbs` | Knowledge base list |
| `/#/kbs/:id/documents` | Document management for a knowledge base |
| `/#/chat?kbId=` | RAG chat (accepts a knowledge base via query) |

## 🔧 Backend Contract Notes

- **IDs are strings**: the backend serializes all ID fields (19-digit snowflake IDs) as JSON strings — they exceed JavaScript's safe integer range (2^53) and would lose precision as numbers
- **POST SSE**: streaming chat is POST + JSON body, which native EventSource doesn't support, so `text/event-stream` is parsed manually via fetch + ReadableStream; event order is `rewrittenQuestion` (multi-turn rewrites only) → `references` (JSON reference list) → repeated `delta` (answer increments) → `done`; any failure becomes an `error` event
- **Stateless multi-turn**: the server keeps no session state; `history` is maintained by the frontend and sent with each request (chronological order, max 20 entries, matching backend validation)
- **Async ingestion**: triggering ingestion after upload returns `PARSING` immediately; the frontend polls the document detail every 2 seconds until the terminal `COMPLETED`/`FAILED` status, then stops automatically

## 📄 License

Licensed under [Apache-2.0](LICENSE) (same as the backend).

## ❓ FAQ

<details>
<summary>The page loads but every request fails with "cannot connect to backend"?</summary>

In dev mode, make sure the backend is running on port 8080. In production, verify the backend URL in Settings and that the backend's `RAG_CORS_ALLOWED_ORIGINS` includes the frontend origin.
</details>

<details>
<summary>All requests return 401 after enabling backend auth?</summary>

Enter one of the keys configured in the backend's `RAG_API_KEYS` in the Settings dialog (top-right); it takes effect immediately after saving, no refresh needed.
</details>

<details>
<summary>Why hash routing instead of history routing?</summary>

Hash routing needs no server-side SPA fallback — the `dist/` output works on any static server (even `file://`), matching this project's zero-config deployment goal.
</details>

<details>
<summary>How do I tune retrieval quality?</summary>

Adjust topK and the similarity threshold in the chat page sidebar; use the "Search only" tab to inspect the exact chunks and scores hit by hybrid retrieval — far more direct than inferring from answer quality.
</details>

## 📞 Support

If you run into problems:

- 🐛 Issue: [open an issue](https://github.com/OOMEcho/rag-knowledge-web/issues)
- 📖 Backend project: [rag-knowledge-system](https://github.com/OOMEcho/rag-knowledge-system)

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

Made with ❤️ by [OOMEcho](https://github.com/OOMEcho)

</div>
