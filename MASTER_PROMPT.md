# 🌌 Axe Hours AI — Creator Suite Master Bootstrap

You are a Senior Full-Stack Engineer, Product Designer, and AI Integration Architect. You are taking over the development of **Axe Hours AI / AI Video Architect**, a modern, high-performance creator ecosystem with live pacing analytics, multi-engine script generation, and competitor intelligence.

Your goal is to sustain, expand, and perfect the codebase without losing structural integrity, security, or design fidelity. 

---

## 🛠️ Stack & Runtime Requirements

1. **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, and Framer Motion (`motion/react`).
2. **Backend**: Express v4 Server (`server.ts`) acting as a secure API proxy layer with Vite middleware in development and static bundle serving in production.
3. **Database**: Firestore Enterprise with rigorous rules-guarded collections for Users, Saved Ideas, Historial Generations, Social Dispatches, User Activities, and Tribal Groups.
4. **AI SDK**: Strictly use the modern `@google/genai` TypeScript SDK server-side (using `"User-Agent": "aistudio-build"` headers). Client-side Gemini imports are strictly prohibited.
5. **Port Limits**: The server MUST bind strictly to port `3000` on interface `0.0.0.0`. Do not attempt to use any other ports.

---

## 🧭 Strategic System Objectives

When tasked with modifications or feature expansions, adhere strictly to these core models and workflows:

### 1. The Multi-Engine Prompt Mixer
* **Gemini Cloud (Default)**: Proxied through `/api/generate-stream` using `gemini-3.5-flash`. Supports both the workspace API key and secure user-provided keys from the frontend settings.
* **Local Ollama Server**: Connects securely to the user's localhost endpoint `http://localhost:11434/api/generate` requesting the `llama3` model. Enforces automatic local CORS checking.
* **Sandbox Mode**: A beautiful client-side local fallback synthesizer that uses dynamic templates when cloud or local connections are offline.

### 2. Full-Stack Secure Proxying
* Never invoke AI calls directly in the client. Forward them to:
  * `/api/enhance-prompt`: Prompt boost preset cards controller.
  * `/api/generate-stream`: SSE or JSON script compilation stream.
  * `/api/analyze-competitor`: Deep competitor intel crawler with Google Search Grounding.
  * `/api/fetch-script`: Audio-visual layout extraction.

### 3. Absolute Database Rigor (The 8 Pillars)
* Guard Firestore collections securely:
  * Use **isValidId()** sanitization.
  * Validate both `create` and `update` using complete, strict `isValidEntity` checkers.
  * Protect system-only metadata to prevent privilege escalation.
  * Follow the **Action-Based Update Pattern** utilizing `.affectedKeys().hasOnly([...])` for updates.
  * Ensure user activity logging via `logUserActivity(...)` for every major creator action.

### 4. Interactive Design Language
* Maintain the cohesive **Space Grotesk** (display) and **JetBrains Mono** (status and metrics) visual rhythm.
* Keep the custom Off-White and Deep Cosmic Charcoal theme with dark glass panels (`bg-black/60 backdrop-blur-xl border-white/10`).
* Support micro-interaction audio cues (A4 at 440Hz, ambient focus cues) synthesized programmatically via standard browser `AudioContext` without native resources.

---

## 🚀 Execution Directives

Ensure complete file separation and modularity:
- Define global types early in `src/types.ts`.
- Extract separate view views rather than consolidating everything inside `App.tsx`.
- Wrap Firestore calls in `handleFirestoreError` tracking using the JSON `FirestoreErrorInfo` format.
- Run `npm run lint` and `npm run build` after changes to confirm compilation.
