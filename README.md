# 🏢 Virtual Office V2 — AI Virtual Office & Multiplayer AI Workforce

<p align="center">
  <strong>A real-time 2D virtual office where humans and AI employees work together.</strong><br/>
  Human supervisors stay in control while AI agents execute department-specific tasks under explicit governance, budgets, approvals, and audit trails.
</p>

<p align="center">
  <a href="https://github.com/Strong-Bee/Virtual-Office-V2">
    <img src="https://img.shields.io/badge/GitHub-Virtual--Office--V2-181717?style=for-the-badge&logo=github" alt="GitHub">
  </a>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Phaser-4.2-8A2BE2?style=for-the-badge" alt="Phaser">
  <img src="https://img.shields.io/badge/Firebase-Realtime-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase">
</p>

> **Repository:** <code>Strong-Bee/Virtual-Office-V2</code>  
> **Architecture:** Next.js App Router + React + TypeScript + Phaser + Firebase + multi-provider AI + WhatsApp + Midtrans

---

## ✨ What Is Virtual Office V2?

Virtual Office V2 turns a conventional business dashboard into an **interactive digital workplace**.

Instead of managing AI agents only through forms and chat panels, users can enter a 2D office, see human and AI employees moving around the workspace, approach AI employees, open collaboration tools, assign work, review outputs, and supervise high-impact actions.

The platform is designed around one core principle:

> **AI can execute work, but humans retain organizational authority.**

### Operating model

    COMPANY / WORKSPACE
              │
       ┌──────┼──────┐
       │      │      │
    MARKETING ENGINEERING FINANCE
       │      │      │
    Supervisor Supervisor Supervisor
       │      │      │
     AI Team AI Team AI Team
       └──────┼──────┘
              │
       HUMAN APPROVAL QUEUE
              │
       AUDIT + BUDGET + GOVERNANCE

---

## 🎯 Core Capabilities

### 🗺️ Interactive 2D Virtual Office

- Top-down multiplayer office environment
- PixiJS-powered 2D spatial engine
- Human player avatars
- AI employee avatars
- Per-department office rooms with room-only team coordination
- AI chat bubbles above speaking characters in 2D and 3D
- Room zones and department areas
- Furniture and collision handling
- Interactive office objects
- Portals between rooms
- Proximity detection
- Camera zoom controls
- Meeting-room interaction
- Whiteboard interaction
- Office map editor
- 60 FPS-oriented rendering and interpolation

### 👥 Multiplayer Presence

- Firebase Authentication
- Firestore realtime synchronization
- Online presence
- Human-to-human collaboration
- AI-to-human interaction
- Global chat
- Room chat
- Proximity chat
- Direct messages
- AI direct conversations
- Remote avatar interpolation
- Movement updates throttled to approximately 250ms while moving

### AI Workforce

Each AI employee has its own:

- Name and role
- Personality
- System prompt
- Restrictions
- AI provider
- Model
- Temperature
- Autonomy level
- Daily budget
- Monthly budget
- Spent-today / spent-month tracking
- Performance score
- Task counters
- Realtime office position
- Operational status

New tasks start automatically when assigned. The lead agent can consult up to
two active teammates in the same department room; their messages and the
result are shown in that room's chat. Failed provider requests remain visible
and retryable instead of being reported as successful. Agents can recover task
runtime state, but never modify or deploy application source code.

### AI provider model

| Provider | Configuration | Current role |
|---|---|---|
| NVIDIA NIM | <code>NVIDIA_API_KEY</code> + configurable base URL | Primary provider |
| Google Gemini | <code>GEMINI_API_KEY</code> / <code>GOOGLE_AI_API_KEY</code> | Primary/fallback |
| OpenAI | <code>OPENAI_API_KEY</code> | OpenAI-compatible adapter |
| OpenRouter | <code>OPENROUTER_API_KEY</code> | OpenAI-compatible adapter |
| 9Router Proxy | <code>NINEROUTER_BASE_URL</code> + <code>NINEROUTER_API_KEY</code> | OpenAI-compatible local or tunnel proxy |
| OpenClaw | <code>OPENCLAW_BASE_URL</code> + <code>OPENCLAW_API_KEY</code> | OpenAI-compatible gateway; run OpenClaw separately |
| Anthropic | <code>ANTHROPIC_API_KEY</code> | Configuration/key-vault ready |

The provider abstraction is centered in <code>src/ai/providers/index.ts</code>.
Use the OpenClaw gateway URL reachable from the app container (for example,
<code>http://openclaw:18789/v1</code> on a shared Docker network); keep its
token in server-side environment secrets.
For 9Router Proxy, use <code>http://localhost:20128/v1</code> when running
Next.js directly on the same machine. Docker Desktop uses
<code>http://host.docker.internal:20128/v1</code> by default; set
<code>NINEROUTER_DOCKER_BASE_URL</code> to the HTTPS tunnel URL if the proxy
cannot be reached through the host bridge. Keep its token in
<code>NINEROUTER_API_KEY</code>, never in browser code.

> **Implementation note:** NVIDIA NIM, Gemini, OpenAI-compatible APIs, and OpenRouter have direct inference paths in the current provider layer. Anthropic credentials are already represented in the settings/key vault, while a dedicated Anthropic inference adapter can be added without changing the AI employee data model.

---

## 🧠 Human-in-the-Loop Governance

Virtual Office V2 is not designed as an unrestricted autonomous-agent system.

Every AI request passes through a risk evaluation layer before inference.

| Risk | Example | Behavior |
|---|---|---|
| 🟢 LOW | Internal analysis | Normal execution |
| 🟡 MEDIUM | Scheduling / external workflow | Approval may be required |
| 🟠 HIGH | Email, campaigns, spending, customer-impacting action | Approval queue |
| 🔴 CRITICAL | Privilege escalation, secret access, security bypass | Blocked |

### Protected AI invariants

AI employees cannot:

- Grant themselves additional permissions
- Increase their own autonomy level
- Access API keys/secrets
- Disable security controls
- Delete or modify protected audit logs
- Bypass human approval requirements
- Perform unrestricted destructive operations

### Emergency controls

Owners/Admins:

    PAUSE ALL AI

Department supervisors:

    PAUSE DEPARTMENT AI

---

## 📋 AI Task Management

AI tasks use an explicit lifecycle:

    TODO
      │
      ▼
    WORKING
      │
      ├──────────────► COMPLETED
      │
      ▼
    REVIEW
      │
      ├──────────────► APPROVED / EXECUTED
      │
      └──────────────► REJECTED

Tasks can contain:

- Department
- Assigned AI employee
- Creator
- Title and description
- Priority
- Risk level
- Approval requirement
- Estimated cost
- Deadline
- Output report
- Audit metadata

---

## 🏛️ Department-Based AI Organization

The workspace model supports department-specific AI teams.

Example:

    COMPANY
    │
    ├── Marketing
    │   ├── Marketing Supervisor
    │   ├── Content AI
    │   ├── SEO AI
    │   └── Campaign AI
    │
    ├── Engineering
    │   ├── Engineering Supervisor
    │   ├── Developer AI
    │   ├── QA AI
    │   └── DevOps AI
    │
    ├── Finance
    │   ├── Finance Supervisor
    │   ├── Accounting AI
    │   └── Finance Analyst AI
    │
    ├── Sales
    │   ├── Sales Supervisor
    │   ├── Lead Research AI
    │   └── Sales Assistant AI
    │
    └── Operations
        ├── Operations Supervisor
        ├── Operations AI
        └── Customer Support AI

The department structure is data-driven and can be extended for different companies and workspaces.

---

## 💬 Collaboration & Meetings

The application includes collaboration-oriented interfaces for:

- Meeting rooms
- Video meeting integration points
- Whiteboards
- AI standups
- AI collaboration
- Task boards
- Approval queues
- Department dashboards
- Proximity interaction
- Office-wide communication

The architecture deliberately separates the spatial/game layer from business UI so the office remains interactive without forcing every workflow into Phaser.

---

## 💳 Midtrans Payment Integration

Virtual Office V2 contains a Midtrans integration layer for client billing and checkout workflows.

Current UI/API foundations include:

- Client invoice creation
- Midtrans Snap checkout
- QRIS / GoPay / ShopeePay flows
- Virtual Account flows
- Credit card / 3DS flow
- Transaction ledger
- Settlement status
- Client package selection
- WhatsApp payment notifications

Example packages represented in the current UI:

| Package | Example price |
|---|---:|
| Starter Virtual Office + 3 AI Agents | Rp2.500.000 |
| Enterprise AI Workforce + 25 Virtual Seats | Rp7.500.000 |
| Unlimited Multi-Tenant + Custom NVIDIA NIM Cluster | Rp18.500.000 |

> These are application examples, not production pricing.

---

## 📱 WhatsApp Automation

WhatsApp notifications are integrated through **Baileys**.

Supported workflow:

- QR-based WhatsApp pairing
- Persistent Baileys authentication
- Connection status
- Automatic reconnect
- Supervisor notifications
- Approval notifications
- Task-completion notifications
- AI budget alerts
- Midtrans settlement notifications
- Delivery logs
- Test messages

    AI Employee
         │
         ▼
    Task / Event
         │
         ▼
    Governance + Approval
         │
         ├────► Human Supervisor
         │             │
         │             ▼
         │        WhatsApp Alert
         │
         ▼
      Audit Log

---

## 🔐 Security Architecture

Firestore security is treated as an application invariant.

Repository security assets include:

- <code>firestore.rules</code>
- <code>DRAFT_firestore.rules</code>
- <code>firestore.rules.test.ts</code>
- <code>security_spec.md</code>

Important security properties:

- Workspace-level authorization
- Verified identity requirements
- PII isolation
- Strict document field validation
- Immutable audit records
- Immutable creation timestamps
- Restricted AI autonomy range
- Terminal task-state protection
- Payload size limits
- Presence identity protection
- Protection against shadow-field injection

### AI autonomy

    Level 0 ─ Human only
    Level 1 ─ Assisted
    Level 2 ─ Supervised execution
    Level 3 ─ High autonomy + governance
    Level 4 ─ Maximum configured autonomy

There is intentionally no unrestricted autonomy level.

---

## 🧩 Technical Architecture

### Frontend

- Next.js 15
- App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand
- Lucide React
- Motion
- React Hook Form
- Zod

### Spatial Engine

- Phaser 4
- Top-down 2D map
- Collision detection
- Room zones
- Portals
- Interactive objects
- Player movement
- AI movement
- Proximity calculations
- Camera controls
- LERP-based remote interpolation

### Backend / API

Next.js Route Handlers provide application APIs such as:

    /app/api/ai/employees
    /app/api/ai/tasks
    /app/api/payments/midtrans
    /app/api/settings/ai
    /app/api/whatsapp

### Realtime / Database

- Firebase Authentication
- Cloud Firestore
- Firebase Admin
- Realtime <code>onSnapshot</code> streams
- Server-side integration manager

### Integrations

- NVIDIA NIM
- Google Gemini
- OpenAI
- OpenRouter
- Anthropic configuration
- Midtrans
- WhatsApp via Baileys
- LiveKit configuration hooks
- S3/R2/Supabase storage configuration hooks
- Redis configuration hooks
- External database configuration hooks

---

## 📁 Project Structure

    Virtual-Office-V2/
    │
    ├── app/
    │   ├── api/
    │   │   ├── ai/
    │   │   ├── payments/
    │   │   ├── settings/
    │   │   └── whatsapp/
    │   ├── dashboard/
    │   ├── workspace/
    │   ├── layout.tsx
    │   └── page.tsx
    │
    ├── src/
    │   ├── ai/
    │   │   └── providers/
    │   │       └── index.ts
    │   ├── components/
    │   │   ├── ai-workforce/
    │   │   ├── dashboard/
    │   │   ├── governance/
    │   │   ├── layout/
    │   │   ├── office/
    │   │   ├── providers/
    │   │   └── settings/
    │   ├── lib/
    │   │   ├── firebase.ts
    │   │   ├── firestore-actions.ts
    │   │   ├── seed-data.ts
    │   │   ├── server-integrations.ts
    │   │   └── sound.ts
    │   ├── store/
    │   │   └── useAppStore.ts
    │   └── types/
    │       └── index.ts
    │
    ├── docs/
    │   └── architecture.md
    ├── firestore.rules
    ├── firestore.rules.test.ts
    ├── security_spec.md
    ├── firebase-blueprint.json
    ├── docker-compose.yml
    ├── Dockerfile
    ├── .env.example
    ├── package.json
    └── README.md

---

## 🚀 Getting Started

### 1. Clone

    git clone https://github.com/Strong-Bee/Virtual-Office-V2.git
    cd Virtual-Office-V2

### 2. Install

Using npm:

    npm install

Or Bun:

    bun install

### 3. Configure environment

Linux/macOS:

    cp .env.example .env

Windows PowerShell:

    Copy-Item .env.example .env

Configure Firebase, AI providers, Midtrans, and WhatsApp credentials as required.

### 4. Start development

    npm run dev

Open:

    http://localhost:3000

### 5. Production build

    npm run build
    npm run start

---

## 🔑 Environment Variables

The repository contains an <code>.env.example</code> template.

### Application

    APP_URL=
    NEXT_PUBLIC_APP_URL=http://localhost:3000

### Database / cache

    DATABASE_URL=
    REDIS_URL=

### Authentication

    AUTH_SECRET=
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

### AI providers

    NVIDIA_API_KEY=
    NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

    GEMINI_API_KEY=
    GOOGLE_AI_API_KEY=

    OPENAI_API_KEY=
    ANTHROPIC_API_KEY=
    OPENROUTER_API_KEY=

### Midtrans

    MIDTRANS_SERVER_KEY=
    MIDTRANS_CLIENT_KEY=
    MIDTRANS_IS_PRODUCTION=false

### WhatsApp

    WHATSAPP_SUPERVISOR_PHONE=
    WHATSAPP_AUTH_DIR=

### Optional infrastructure

    S3_ENDPOINT=
    S3_ACCESS_KEY=
    S3_SECRET_KEY=
    S3_BUCKET=

    LIVEKIT_URL=
    LIVEKIT_API_KEY=
    LIVEKIT_API_SECRET=

> **Security:** API keys must remain server-side. Never expose provider secrets through <code>NEXT_PUBLIC_*</code> variables.

---

## 🧪 Testing & Validation

Run linting:

    npm run lint

Review the architecture:

    docs/architecture.md

Review the security model:

    security_spec.md

Before production deployment, validate:

- Firebase Authentication configuration
- Firestore rules
- API key storage
- Midtrans production credentials
- WhatsApp session storage
- Origin/security policy
- Rate limits
- AI budget limits
- Approval policy
- Audit-log integrity
- Backup and recovery

---

## 🐳 Docker

The repository contains:

    Dockerfile
    docker-compose.yml
    .dockerignore

Typical flow:

    docker compose build
    docker compose up -d

Supply secrets through the deployment environment instead of committing them.

---

## 🔄 AI Execution Flow

    Human / Event
          │
          ▼
      Create Task
          │
          ▼
    Department + AI Context
          │
          ▼
      Risk Evaluation
          │
      ┌───┼───────────────┐
      │   │               │
      ▼   ▼               ▼
    BLOCK APPROVAL       EXECUTE
          │               │
          └───────┬───────┘
                  ▼
             AI Provider
                  │
        ┌─────────┼─────────┐
        │         │         │
      NVIDIA    Gemini    OpenAI /
       NIM                OpenRouter
        │         │         │
        └─────────┼─────────┘
                  ▼
              AI Output
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      Result     Cost      Audit
        │         │         │
        └─────────┼─────────┘
                  ▼
          Human Supervisor

---

## 💰 AI Cost & Budget Governance

Every AI employee can track:

- Daily budget
- Monthly budget
- Spent today
- Spent this month
- Estimated task cost
- Performance score
- Completed/pending tasks

This turns the project from a simple AI chat interface into an **AI workforce operating system** where AI consumption can be measured and governed.

---

## 🏗️ Design Philosophy

    ┌───────────────────────────────────┐
    │          VIRTUAL OFFICE           │
    └─────────────────┬─────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       SPATIAL      BUSINESS       AI
        LAYER        LAYER      WORKFORCE
          │           │           │
       Phaser      React/UI    Providers
          └───────────┼───────────┘
                      ▼
                 GOVERNANCE
                      │
              HUMAN SUPERVISION

The spatial layer provides presence and context.

The business layer provides workflows.

The AI layer provides intelligence.

The governance layer provides control.

---

## 🛣️ Roadmap

### Current foundation

- [x] Next.js App Router
- [x] React + TypeScript
- [x] Phaser virtual office
- [x] Firebase authentication/realtime foundation
- [x] AI employee data model
- [x] Multi-provider AI configuration
- [x] AI risk evaluation
- [x] Human approval workflow
- [x] AI activity logs
- [x] AI task board
- [x] Office map editor
- [x] Meeting/whiteboard UI foundation
- [x] Midtrans integration foundation
- [x] WhatsApp/Baileys integration
- [x] Firestore security rules and tests
- [x] Docker configuration

### Next-stage opportunities

- [ ] Dedicated Anthropic inference adapter
- [ ] Persistent production database abstraction
- [ ] Redis/BullMQ background job execution
- [ ] Production WebRTC/SFU with LiveKit
- [ ] Document ingestion and RAG knowledge bases
- [ ] Advanced AI tool calling
- [ ] Department-level KPI automation
- [ ] AI workforce analytics
- [ ] Usage-based billing
- [ ] Multi-tenant SaaS billing
- [ ] SSO / enterprise identity
- [ ] Advanced observability
- [ ] AI agent marketplace
- [ ] Voice-enabled AI employees
- [ ] Richer character animation system
- [ ] Advanced office assets and character packs

---

## 🤝 Contributing

Contributions are welcome.

Recommended workflow:

    git checkout -b feature/your-feature
    git add .
    git commit -m "feat: describe your change"
    git push origin feature/your-feature

Then open a Pull Request.

For security-sensitive changes, review the Firestore rules and <code>security_spec.md</code> before submitting.

---

## 🔒 Security Disclosure

Do not publish:

- API keys
- Firebase service-account credentials
- OAuth client secrets
- Midtrans server keys
- WhatsApp session credentials
- Production database credentials
- Redis credentials
- Storage access keys

If you discover a security issue, avoid publishing exploit details publicly until it has been responsibly assessed.

---

## 📚 Documentation

- **Architecture:** <code>docs/architecture.md</code>
- **Security specification:** <code>security_spec.md</code>
- **Firestore rules:** <code>firestore.rules</code>
- **Firestore tests:** <code>firestore.rules.test.ts</code>
- **Environment template:** <code>.env.example</code>

---

## 📜 License

No explicit open-source license is currently declared in this repository.

Until a license is added, the default GitHub copyright rules apply and reuse should not be assumed to be permitted.

---

<p align="center">
  <strong>Virtual Office V2</strong><br/>
  Build companies where humans supervise intelligent digital coworkers.
</p>
