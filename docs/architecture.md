# System Architecture & AI Governance Specification

## 1. Spatial Rendering vs. React UI
- **PixiJS (`VirtualOfficeCanvas.tsx`)** renders the interactive 2D tile map, room zones, furniture collisions, portal teleportation, proximity interactions, and interpolated multiplayer avatars.
- **React Three Fiber + Three.js + Drei (`VirtualOffice3DView.tsx`)** provides the switchable 3D office view and orbit controls.
- **GSAP** animates canvas zoom and world effects; **Motion** animates React panels. **Rive** can load optional `.riv` avatar files from the AI interaction panel.
- **Spine and Live2D Cubism** are shown as integration placeholders only. Add the Spine runtime after providing its license and Cubism after supplying its licensed SDK and model assets.
- **React 19 + Zustand (`useAppStore.ts`)** manages authentication, workspace switching, the AI Workforce Control Center, Kanban Task Board, Human Approval Queue, WebRTC Meeting Room & Whiteboard, and Office Map Editor.

## 2. Realtime Synchronization & Throttling
- Movement packets are never written to the database on every frame.
- Position updates are throttled to `250ms` intervals only while the avatar is actively moving, preventing write amplification while maintaining smooth remote avatar interpolation.

## 3. WhatsApp Connection
- **Baileys (`app/api/whatsapp/route.ts`)** owns the WhatsApp Web socket, QR pairing, reconnect flow, and message delivery.
- Authentication files are stored in `.baileys-auth` by default. Docker Compose mounts a persistent volume there; deployments must run a persistent Node.js process and preserve this directory.

## 4. Multi-Provider AI Engine (NVIDIA NIM + Google Gemini)
- Located in `src/ai/providers/index.ts`.
- Supports **NVIDIA NIM** (`https://integrate.api.nvidia.com/v1/chat/completions` with `meta/llama-3.1-70b-instruct`) and **Google Gemini** (`@google/genai` with `gemini-3.8-flash`).
- All requests pass through `evaluatePromptRisk()` before inference to block privilege escalation and flag high-risk operations for Human Supervisor review.
