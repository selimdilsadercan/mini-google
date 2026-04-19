# Mini-Google: Lead Developer Initial System Assessment Report

**Date:** 2026-04-19
**Role:** Senior Backend Systems Engineer (Lead Dev)
**Project State:** Initial Implementation / MVP Phase

---

## 1. Executive Summary
The "Mini-Google" project is a well-structured web crawler and search engine designed for high-performance single-machine operations. The current tech stack (Next.js 14, TypeScript, better-sqlite3) is perfectly aligned with the project's goals of local persistence and low latency. However, there are critical areas in resilience, search relevancy, and long-term data management that require immediate attention to reach a production-ready ("Senior Level") standard.

---

## 2. Technical Strengths
- **Storage Choice:** `better-sqlite3` is an excellent choice for this architecture. Its synchronous nature (at the worker level) combined with SQLite's WAL (Write-Ahead Logging) mode allows for high-concurrency read-writes.
- **Search Logic:** The implementation of **FTS5 (Full-Text Search)** provides a fast baseline for search without needing external services like Elasticsearch.
- **Back-Pressure Management:** The project correctly identifies the need for hit-rate limiting and concurrent request management to prevent self-DDOS and local OOM (Out of Memory) errors.

---

## 3. Critical Vulnerabilities & Technical Debt

### 3.1 Persistence & Job Continuity
- **Status:** Vulnerable.
- **Analysis:** Crawler jobs are tracked in a `Map` in memory. If the process crashes or restarts, active jobs are lost even though data is in the DB. There is no mechanism to "re-hydrate" or "resume" unfinished crawls from the persistent queue on startup.

### 3.2 Search Relevancy (The "Google" in Mini-Google)
- **Status:** Basic.
- **Analysis:** The current scoring algorithm `(Title Match * 50) + (10 - depth)` is too primitive. It doesn't account for text density, keyword frequency (BM25), or link-based authority.
- **Risk:** Users will find relevant results buried under less relevant ones as the database grows to 200MB+.

### 3.3 Noise in Indexing
- **Status:** High.
- **Analysis:** While `script` and `style` tags are removed, modern pages are filled with boilerplate (headers, footers, navs). The crawler currently indexes everything, which dilutes the search index with "Home", "Privacy Policy", and "Contact Us" text from every single page.

---

## 4. Strategic Recommendations (The Roadmap)

### Phase 1: Resilience (Immediate)
1. **Auto-Resume Logic:** Modify the `CrawlerManager` to scan the `crawlers` table on initialization. Any job with status `running` or `pending` should be automatically re-queued.
2. **Database Hardening:** Implement explicit PRAGMA settings for SQLite (e.g., `journal_mode=WAL`, `synchronous=NORMAL`) to maximize throughput without risking corruption.

### Phase 2: Intelligence (Short-term)
1. **BM25 Integration:** Update `db.ts` to utilize SQLite's built-in `bm25()` ranking function for the FTS5 table.
2. **Smart Filtering:** Implement a more robust "content extractor" that prioritizes `<main>` or `<article>` tags over generic `<body>` text.

### Phase 3: Observability (Mid-term)
1. **Dashboard Enhancements:** Integration of real-time metrics (Requests per second, Error rates, Queue depth visualization).
2. **Domain Affinity:** Visual representation of which domains are being crawled most frequently.

---

## 5. Conclusion
The foundation is strong. By shifting from "Memory-based management" to "Fully-persistent management" and refining our search algorithms, we can transform this MVP into a truly capable single-node search engine.

---
*Signed,*
**Antigravity (Lead Developer)**
