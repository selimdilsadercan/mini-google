# 🚀 Mini-Google: Advanced Multi-Agent Web Crawler & Search Engine

A high-performance, resilient, and intelligent web search ecosystem built using a **Multi-Agent AI Workflow**. This project demonstrates a senior-level architecture capable of large-scale crawling on a single machine with real-time search capabilities.

## 🌟 Key Features

- **Multi-Agent Orchestration:** Developed through the collaboration of specialized AI agents (Orchestrator, Dev, Design, QA).
- **Concurrency via Worker Threads:** Utilizes Node.js `worker_threads` to isolate crawling I/O from the UI/API, ensuring 100% responsiveness.
- **k-Depth Crawling & Deduplication:** Efficiently explores the web up to $k$ hops without redundant processing.
- **Smart Search (BM25):** Employs the industry-standard BM25 ranking algorithm via SQLite FTS5 for highly relevant search results.
- **Automatic Resume (Persistence):** Robust rehydration logic allows the system to continue stopped or crashed jobs automatically upon restart.
- **Visual Analytics:** A premium Glassmorphism dashboard providing real-time telemetry, queue depth, and fleet status.

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh/) (for high-speed execution)
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Engine:** Cheerio & Node.js Native Worker Threads
- **Database:** SQLite (Better-SQLite3) with WAL Mode for concurrent Read-Writes.
- **Styling:** Tailwind CSS (Custom Glassmorphism System)

## 🏁 Getting Started

### Installation
1. Navigate to the core directory:
   ```bash
   cd core
   ```
2. Install dependencies:
   ```bash
   bun install
   ```

### Running Locally
1. Start the development server:
   ```bash
   bun run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) for the search interface.
3. Open [http://localhost:3000/admin](http://localhost:3000/admin) for the Control Center.

## 🧠 Multi-Agent Development Workflow
This project was built using an agentic lifecycle:
1. **The Orchestrator** defined the strategy and assigned tasks.
2. **Dev-Agent** implemented the persistence and crawler logic.
3. **Design-Agent** crafted the premium UI and analytics.
4. **QA-Agent** audited data integrity and back-pressure.

For detailed information on agent interactions, see [multi_agent_workflow.md](./multi_agent_workflow.md).

## 📊 System Design (Requirement Answers)
- **Back-Pressure:** Controlled via `hitRate` throttling and `maxConcurrent` request limiting within the Worker pool.
- **Search while Indexing:** Enabled by SQLite's **Write-Ahead Logging (WAL)**, allowing the search engine to read recently committed indices without blocking the active writer.

## 📜 Project Artifacts
- [Multi-Agent Workflow](./multi_agent_workflow.md)
- [Production Recommendations](./recommendation.md)
- [Product Requirements (PRD)](./product_prd.md)
- [Agent Personas](./agents/)
