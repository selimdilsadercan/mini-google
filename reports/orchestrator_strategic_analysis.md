# 🛰️ Orchestrator Strategic Analysis Report (V2)

**Project:** Mini-Google  
**Date:** 2026-04-19  
**Status:** Functional MVP / Premium UI  

## 1. Executive Summary
The system has achieved persistence and visual excellence. The next leap involves transforming the project from a "scraper with a UI" into an "intelligent information retrieval engine." This requires focus on mathematical ranking, asynchronous job execution, and longitudinal telemetry.

## 2. Technical Gaps & Justifications

### 2.1 Search Relevance (The BM25 Problem)
*   **Current State:** Linear scoring based on title match and depth.
*   **Proposed Improvement:** Integration of SQLite FTS5 `bm25()` ranking function.
*   **Justification:** BM25 (Best Matching 25) is the industry standard for document ranking. It considers term frequency and inverse document frequency, ensuring that "rare" words in a query have more weight than common ones.

### 2.2 Concurrency Isolation (Worker Threads)
*   **Current State:** Crawler logic runs within the Next.js process context.
*   **Proposed Improvement:** Utilizing Node.js `worker_threads` to isolate crawling I/O from the main API thread.
*   **Justification:** Heavy crawling shouldn't block search queries or dashboard updates. Isolation ensures high INP (Interaction to Next Paint) scores.

### 2.3 Data Analytics (Telemetry)
*   **Current State:** Real-time metrics only.
*   **Proposed Improvement:** Metric snapshotting table (`system_metrics`) to track indexed pages growth over time.
*   **Justification:** Necessary for hardware planning and identifying bottleneck patterns in different times of day.

## 3. Risk Assessment
*   **Database Lock:** Higher concurrency might cause `SQLITE_BUSY` errors. Solution: Ensure WAL mode is active.
*   **Memory Pressure:** Broad crawls need better memory capping.

---
*Signed,*  
**Antigravity Orchestrator**
