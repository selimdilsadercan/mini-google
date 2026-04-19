# 📝 Task Definition: Intelligence & Concurrency Isolation
**Target Agent:** Dev-Agent  
**Priority:** CRITICAL  
**Status:** ASSIGNED  

## 🎯 Objective
Improve the search experience by implementing industry-standard ranking and ensure system stability through process isolation.

## 🛠️ Scope of Work

### Task 1: BM25 Search Ranking
-   **Implementation:** Modify `db.ts` search function.
-   **Method:** Replace manual `relevance_score` calculation with SQLite FTS5 `rank`.
-   **Refinement:** Use the formula `ORDER BY rank` to ensure documents with higher keyword density (adjusted for length) appear first.

### Task 2: Worker Thread Migration (Phase A Planning)
-   **Implementation:** Research and prepare `core/lib/worker.ts`.
-   **Goal:** Move the `Cheerio` parsing and `fetch` logic out of the main event loop.
-   **Validation:** Verify that even with 50 concurrent requests, the UI `/admin` page loads in < 100ms.

## 📊 Evaluation Criteria
-   Searching for "Wikipedia" should rank the main domain above sub-pages.
-   No system-wide lag during heavy crawl cycles.

---
*Authorized by Orchestrator*
