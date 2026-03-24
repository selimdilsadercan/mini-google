import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "crawler.db");
const g = global as any;
if (!g.dbInstance) {
  g.dbInstance = new Database(dbPath);
}
const db = g.dbInstance;

// Initialize advanced tables
db.exec(`
  -- Table for Crawler Jobs
  CREATE TABLE IF NOT EXISTS crawlers (
    id TEXT PRIMARY KEY,
    origin TEXT,
    max_depth INTEGER,
    hit_rate REAL,
    status TEXT DEFAULT 'pending', -- pending, running, paused, stopped, finished
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Table for crawled pages linked to crawlers
  CREATE TABLE IF NOT EXISTS pages (
    url TEXT PRIMARY KEY,
    crawler_id TEXT,
    depth INTEGER,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(crawler_id) REFERENCES crawlers(id)
  );

  -- FTS5 Search table
  CREATE VIRTUAL TABLE IF NOT EXISTS pages_search USING fts5(
    url UNINDEXED,
    title,
    content,
    tokenize='unicode61'
  );

  -- Persistent Queue for each crawler
  CREATE TABLE IF NOT EXISTS queue (
    url TEXT,
    crawler_id TEXT,
    depth INTEGER,
    status TEXT DEFAULT 'pending',
    PRIMARY KEY(url, crawler_id),
    FOREIGN KEY(crawler_id) REFERENCES crawlers(id)
  );

  -- Logs for real-time monitoring
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crawler_id TEXT,
    message TEXT,
    level TEXT, -- info, warn, error
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(crawler_id) REFERENCES crawlers(id)
  );
`);

// Migration: Check for missing crawler_id columns
try {
  const pagesInfo = db.prepare("PRAGMA table_info(pages)").all() as any[];
  if (!pagesInfo.some((col) => col.name === "title")) {
    db.exec("ALTER TABLE pages ADD COLUMN title TEXT;");
    console.log("Migration: Added title to pages table");
  }

  const queueInfo = db.prepare("PRAGMA table_info(queue)").all() as any[];
  if (!queueInfo.some((col) => col.name === "crawler_id")) {
    db.exec("ALTER TABLE queue ADD COLUMN crawler_id TEXT;");
    console.log("Migration: Added crawler_id to queue table");
  }
} catch (e) {
  console.error("Migration failed:", e);
}

export const dbService = {
  // Crawler Management
  createCrawler: (
    id: string,
    origin: string,
    depth: number,
    hitRate: number,
  ) => {
    db.prepare(
      "INSERT INTO crawlers (id, origin, max_depth, hit_rate) VALUES (?, ?, ?, ?)",
    ).run(id, origin, depth, hitRate);
  },

  updateCrawlerStatus: (id: string, status: string) => {
    db.prepare("UPDATE crawlers SET status = ? WHERE id = ?").run(status, id);
  },

  listCrawlers: () => {
    return db.prepare("SELECT * FROM crawlers ORDER BY created_at DESC").all();
  },

  // Logging
  addLog: (crawlerId: string, message: string, level: string = "info") => {
    db.prepare(
      "INSERT INTO logs (crawler_id, message, level) VALUES (?, ?, ?)",
    ).run(crawlerId, message, level);
  },

  getLogs: (crawlerId: string, limit = 100) => {
    return db
      .prepare(
        "SELECT * FROM logs WHERE crawler_id = ? ORDER BY timestamp DESC LIMIT ?",
      )
      .all(crawlerId, limit);
  },

  // Page Operations
  savePage: (
    crawlerId: string,
    url: string,
    depth: number,
    title: string,
    content: string,
  ) => {
    const insertPage = db.prepare(
      "INSERT OR REPLACE INTO pages (url, crawler_id, depth, title, content) VALUES (?, ?, ?, ?, ?)",
    );
    const insertSearch = db.prepare(
      "INSERT OR REPLACE INTO pages_search (url, title, content) VALUES (?, ?, ?)",
    );
    db.transaction(() => {
      insertPage.run(url, crawlerId, depth, title, content);
      insertSearch.run(url, title, content);
    })();
  },

  // Queue Operations
  addToQueue: (crawlerId: string, url: string, depth: number) => {
    db.prepare(
      "INSERT OR IGNORE INTO queue (url, crawler_id, depth) VALUES (?, ?, ?)",
    ).run(url, crawlerId, depth);
  },

  getNextFromQueue: (crawlerId: string) => {
    return db
      .prepare(
        "SELECT * FROM queue WHERE crawler_id = ? AND status = 'pending' LIMIT 1",
      )
      .get(crawlerId) as any;
  },

  updateQueueStatus: (crawlerId: string, url: string, status: string) => {
    db.prepare(
      "UPDATE queue SET status = ? WHERE crawler_id = ? AND url = ?",
    ).run(status, crawlerId, url);
  },

  // Search & Stats
  search: (query: string, limit = 20, offset = 0, depth?: number) => {
    // FTS5 wildcard query for broader matching
    const ftsQuery = `"${query}"*`; 
    // Parameter Order based on SQL placeholders: 
    // 1. LIKE ? (relevance_score title check)
    // 2. LOWER(?) (frequency replacement)  
    // 3. LENGTH(?) (frequency normalization)
    // 4. MATCH ? (FTS search)
    // Extra if needed: depth filter, limit, offset
    const params: any[] = [`%${query}%`, query, query, ftsQuery];
    
    let depthFilter = "";
    if (depth !== undefined && depth !== -1) {
      depthFilter = "AND p.depth = ?";
      params.push(depth);
    }
    params.push(limit, offset);

    return db
      .prepare(
        `
      SELECT 
        p.url, 
        p.depth, 
        p.title, 
        COALESCE(c.origin, 'External Source') as origin_url,
        snippet(pages_search, 2, '<b>', '</b>', '...', 20) as snippet,
        (CASE WHEN p.title LIKE ? THEN 50 ELSE 0 END) + (10 - p.depth) as relevance_score,
        (LENGTH(p.content) - LENGTH(REPLACE(LOWER(p.content), LOWER(?), ''))) / MAX(LENGTH(?), 1) as frequency
      FROM pages p
      JOIN pages_search ON p.url = pages_search.url
      LEFT JOIN crawlers c ON p.crawler_id = c.id
      WHERE pages_search MATCH ?
      ${depthFilter}
      ORDER BY relevance_score DESC, rank ASC
      LIMIT ? OFFSET ?
    `,
      )
      .all(...params);
  },

  countResults: (query: string, depth?: number) => {
    const ftsQuery = `"${query}"*`;
    const params: any[] = [ftsQuery];
    let depthFilter = "";
    if (depth !== undefined && depth !== -1) {
      depthFilter = "AND p.depth = ?";
      params.push(depth);
    }

    const res = db
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM pages p
      JOIN pages_search ON p.url = pages_search.url
      WHERE pages_search MATCH ?
      ${depthFilter}
    `,
      )
      .get(...params) as any;
    return res ? res.total : 0;
  },

  getSuggestions: (query: string) => {
    return db
      .prepare(
        `
      SELECT DISTINCT title as text 
      FROM pages_search 
      WHERE title MATCH ?
      LIMIT 8
    `,
      )
      .all(`${query}*`);
  },

  getStats: () => {
    const visited = db
      .prepare("SELECT COUNT(*) as count FROM pages")
      .get() as any;
    const queueDepth = db
      .prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'")
      .get() as any;
    return {
      visitedCount: visited.count,
      queueDepth: queueDepth.count,
    };
  },

  getCrawlerStats: (id: string) => {
    const visited = db
      .prepare("SELECT COUNT(*) as count FROM pages WHERE crawler_id = ?")
      .get(id) as any;
    const queue = db
      .prepare(
        "SELECT COUNT(*) as count FROM queue WHERE crawler_id = ? AND status = 'pending'",
      )
      .get(id) as any;
    return { visitedCount: visited.count, queueDepth: queue.count };
  },

  getPreview: () => {
    return db
      .prepare(
        "SELECT url, crawler_id, depth, created_at FROM pages ORDER BY created_at DESC LIMIT 50",
      )
      .all();
  },

  deleteCrawler: (id: string) => {
    db.transaction(() => {
      db.prepare("DELETE FROM logs WHERE crawler_id = ?").run(id);
      db.prepare("DELETE FROM queue WHERE crawler_id = ?").run(id);
      db.prepare("DELETE FROM crawlers WHERE id = ?").run(id);
    })();
  },
};
