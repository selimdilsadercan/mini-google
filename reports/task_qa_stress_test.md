# 📝 Task Definition: Stress Test & Data Integrity Audit
**Target Agent:** QA-Agent  
**Priority:** MEDIUM  
**Status:** ASSIGNED  

## 🎯 Objective
Identify the performance breaking points of the single-node architecture and ensure zero data corruption.

## 🛠️ Scope of Work

### Task 1: Scale Stress Test
-   **Operation:** Initialize 5 simultaneous deployments with different highly-connected origins (e.g., Wikipedia, GitHub, TechCrunch).
-   **Goal:** Reach 10,000 indexed pages.
-   **Monitoring:** Track `crawler.db` file size and query latency growth.

### Task 2: Deduplication Integrity Check
-   **Operation:** Audit the `pages` table for duplicate URLs indexed across different crawler jobs.
-   **Goal:** Ensure the `UNIQUE` constraint on URL is never violated and that data remains clean even if multiple crawlers hit the same endpoint.

## 📊 Evaluation Criteria
-   Zero `SqliteError: database is locked` exceptions during the 5-way crawl.
-   Consistent search latency (< 200ms) with 10k+ records.

---
*Authorized by Orchestrator*
