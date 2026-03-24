# Mini-Google: Web Crawler & Search Engine

A high-performance, concurrent web crawler and search engine built with **Next.js 14**, **TypeScript**, and **Node.js**. This project allows crawling web pages to a specified depth and searching the indexed content in real-time.

## 🚀 Key Features

- **Concurrent Indexing & Search:** Search indexed pages while the crawler is still active.
- **k-Depth Crawling:** Initiate crawls from a URL with a configurable maximum hop depth.
- **Back-Pressure Management:** Built-in rate-limiting and queue depth control to handle large-scale crawls.
- **Real-Time Dashboard:** View indexing progress, queue status, and system performance live.
- **Persistence (Bonus):** State is saved locally, allowing for interrupted crawls to be resumed.
- **Language-Native:** Core crawl logic built using native fetch/Node.js to ensure maximum performance and control.

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS / Modern CSS
- **Storage:** Local JSON/SQLite for simple, single-machine persistence.

## 🏁 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd core
   ```
3. Setup Database (Optional):
   - **Option A: Start with Pre-crawled Data (200MB):** We provide a large pre-indexed database via GitHub Releases to bypass the 100MB repository limit. This contains the data required for the `quiz.md`. Run:
     ```bash
     npm run db:setup
     ```
   - **Option B: Start from Scratch:** If you prefer to start with an empty index, skip the step above. The system will automatically generate a fresh `crawler.db` when you initiate your first crawl.

### Running Locally
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧠 How It Works

### Indexing Engine
The engine uses a non-blocking, asynchronous queue to fetch pages. To manage "back-pressure," it limits the number of concurrent network requests and processes pages in batches. Deduplication is handled via a URL set to ensure no page is visited twice.

### Search Design (Requirement Answer)
To allow search while indexing is active, we utilize a **Concurrent Reader-Writer** pattern facilitated by **SQLite (WAL Mode)** or a decoupled architecture. As new pages are parsed, they are immediately committed to a search-optimized table. This ensures the search engine queries are non-blocking and always reflect the most recently crawled data without waiting for the entire crawl to finish.

## 📜 Documentation
- [Gereksinimler (PRD)](./product_prd.md)
- [Production Recommendations](./recommendation.md)
