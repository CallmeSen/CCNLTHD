# FinAgents Frontend

Modern React frontend for the multi-agents-service portfolio advisory platform.

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** — utility-first styling
- **TanStack Query** — server state management
- **Recharts** — portfolio visualization (pie charts, bar charts)
- **React Markdown** — rendering advisory reports
- **Zustand** — lightweight global state
- **React Router v6** — client-side routing
- **Framer Motion** — animations
- **Lucide React** — icon library

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Overview: health status, agent pipeline, recent analyses |
| `/analysis` | Analysis | Submit portfolio analysis request with live agent tracker |
| `/history` | History | Browse all past analyses with search |
| `/report/:runId` | Report | Full report view with charts and markdown rendering |

## Setup

### Prerequisites

- Backend running at `http://localhost:8000`
- Node.js 18+

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. API proxy is configured to `http://localhost:8000`.

### Environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

### Production Build

```bash
npm run build
npm run preview
```

## API Integration

The frontend integrates with these backend endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | API health check |
| POST | `/portfolio/analyze` | Submit analysis request |
| GET | `/portfolio/history` | List past analyses |
| GET | `/portfolio/report/:runId` | Get report details |

## Features

- **Agent Workflow Tracker** — visualizes all 9 LangGraph agents in real-time during analysis
- **Portfolio Charts** — interactive pie chart (allocation) and bar chart (metrics) via Recharts
- **Markdown Reports** — full advisory reports rendered with proper styling
- **Compliance Badge** — color-coded PASS / HOLD / BLOCK indicator
- **Multi-language** — English and Vietnamese support
- **Search & Filter** — filter history by request text or run ID
- **Responsive Design** — works on desktop and tablet
