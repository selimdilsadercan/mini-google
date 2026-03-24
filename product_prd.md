# Product Requirements Document: Web Crawler & Search Engine

## 1. Project Overview
A lightweight, high-performance web crawler that indexes web pages and provides real-time search capabilities. Designed to handle large crawls on a single machine with back-pressure management.

## 2. Core Features

### 2.1 Indexing (`/index`)
- **Capability:** Crawl web pages starting from an `origin` URL up to depth `k`.
- **Constraint:** Never crawl the same URL twice (Deduplication).
- **Parameters:**
  - `origin`: Starting URL.
  - `k`: Maximum number of hops from the origin.
- **Back-Pressure:** Implement a mechanism to control the rate of crawling via a configurable `hitRate` (requests per second) and `maxConcurrent` requests to prevent system overload.
- **Scale:** Architecture optimized for large-scale operations on a single node using a persistent persistent queue.

### 2.2 Searching (`/search`)
- **Capability:** Query the indexed content and return relevant results.
- **Output:** List of triples `(relevant_url, origin_url, depth)`.
- **Concurrency:** Search must function while indexing is active, providing near real-time results for newly discovered pages.
- **Relevancy:** Simple keyword-based or semantic relevance logic.

### 2.3 Dashboard (UI/CLI)
- **Controls:** Start/Pause/Stop indexing and initiate searches.
- **Observability:** 
  - Real-time indexing progress (pages discovered, pages crawled).
  - Current queue depth and back-pressure status.
  - Performance metrics (requests per second).

## 3. Technical Stack
- **Framework:** Next.js 16 (App Router).
- **Language:** TypeScript.
- **Crawler:** Cheerio / Fetch API / Node.js.
- **State Management:** SQLite via `better-sqlite3` for high-performance local persistence.
- **Styling:** Tailwind CSS (for a premium UI).

## 4. Architectural Considerations
- **Concurrency Model:** Using a worker-like pattern or async request pools for crawling.
- **Back-Pressure Implementation:** Utilizing a queue with manageable depth and adjustable processing rates.
- **Persistence:** (Bonus) Save index state to allow resuming after a crash or restart.

## 5. Deployment Options
- Single machine localhost.
- Recommendations for production deployment (Cloud workers, distributed DBs, etc.).
