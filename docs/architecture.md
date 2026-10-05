# System Architecture & AI Governance Specification

## 1. Spatial 2D Engine vs. React UI Separation
- **Phaser.js (`VirtualOfficeCanvas.tsx`)** manages the 2D top-down tile map, room zones (Lobby, Boardroom Alpha, Lounge, Marketing Wing, Engineering Lab, Finance Suite), furniture collision detection, portal teleportation, proximity distance calculation, and 60fps linear interpolation (LERP).
- **React 19 + Zustand (`useAppStore.ts`)** manages authentication, workspace switching, the AI Workforce Control Center, Kanban Task Board, Human Approval Queue, WebRTC Meeting Room & Whiteboard, and Office Map Editor.

## 2. Realtime Synchronization & Throttling
- Movement packets are never written to the database on every frame.
- Position updates are throttled to `250ms` intervals only while the avatar is actively moving, preventing write amplification while maintaining smooth remote avatar interpolation.

## 3. Multi-Provider AI Engine (NVIDIA NIM + Google Gemini)
- Located in `src/ai/providers/index.ts`.
- Supports **NVIDIA NIM** (`https://integrate.api.nvidia.com/v1/chat/completions` with `meta/llama-3.1-70b-instruct`) and **Google Gemini** (`@google/genai` with `gemini-3.8-flash`).
- All requests pass through `evaluatePromptRisk()` before inference to block privilege escalation and flag high-risk operations for Human Supervisor review.
