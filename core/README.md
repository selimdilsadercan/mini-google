# Mini-Google Crawler & Search Engine

A lightweight, high-performance web crawler and search engine built with Next.js and SQLite.

## Features

- **Web Crawler**: Indexes web pages starting from an origin URL up to a specified depth.
- **Search Engine**: Real-time search with keyword relevance and site grouping.
- **Dashboard**: Monitor crawling progress, queue depth, and logs.
- **REST API**: Programmatic access to indexing and search capabilities.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) for the Search Engine.
4. Open [http://localhost:3000/admin](http://localhost:3000/admin) for the Crawler Dashboard.

## API Documentation

### Start Indexing
`POST /api/crawler/create`
```json
{
  "origin": "https://example.com",
  "depth": 2,
  "hitRate": 5
}
```

### Search
`GET /api/search?q=query`

### System Status
`GET /api/status?id={crawler_id}`

## Architecture

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3) with FTS5 for full-text search
- **Crawler**: Custom Node.js crawler with Cheerio for parsing

## License

MIT
