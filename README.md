# NexusOS — AI Virtual Office & Multiplayer AI Workforce Platform

NexusOS is a 2D Multiplayer Virtual Office and Enterprise AI Workforce Platform where human employees and autonomous AI agents collaborate in real time under strict **Human-in-the-Loop (HITL)** governance.

## 1. Core Product Architecture

```
                    COMPANY (Workspace)
                       │
       ┌───────────────┼────────────────┐
       │               │                │
   MARKETING       ENGINEERING       FINANCE
       │               │                │
   👨 Andi         👨 Budi          👩 Siti
   Supervisor      Supervisor       Supervisor
       │               │                │
   🤖 Sarah        🤖 Codey         🤖 Fin
   🤖 Alex         🤖 Nova          🤖 Maya
```

- **Frontend & Spatial Engine**: Next.js 15 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Zustand, Phaser.js 2D Arcade Physics Engine.
- **Realtime & Persistence**: Firebase Firestore (`onSnapshot` delta streams with 250ms movement throttling and linear interpolation), Firebase Authentication (`signInWithPopup`).
- **Multi-Provider AI Abstraction**:
  - **NVIDIA NIM API** (`NVIDIA_API_KEY` via `https://integrate.api.nvidia.com/v1/chat/completions`, default `meta/llama-3.1-70b-instruct`)
  - **Google Gemini SDK** (`@google/genai` using `gemini-3.8-flash`)
  - **OpenAI / Anthropic / OpenRouter** compatible abstraction

## 2. Environment Variables (`.env.example`)

Configure your secrets in AI Studio **Settings > Secrets** or `.env`:
- `NVIDIA_API_KEY`: Your NVIDIA NIM API key (`nvapi-...`) for Llama 3.1 / Nemotron / DeepSeek inference.
- `GEMINI_API_KEY`: Server-side Google Gemini API key.

## 3. Security & AI Governance Invariants

1. **Zero-Trust AI Rules (#38)**: AI employees cannot create unrestricted agents, escalate their own autonomy level, access API keys, or modify/delete `aiActivityLogs`.
2. **Human-in-the-Loop Approvals**: High-risk actions (external emails, campaign launches, financial commitments) are automatically intercepted and placed in the `REVIEW` Approval Queue for the Department Supervisor.
3. **Emergency Kill-Switch**: Owners/Admins can pause all AI employees globally (`PAUSE ALL AI`), and Supervisors can pause their department's AI agents (`PAUSE DEPARTMENT AI`).
