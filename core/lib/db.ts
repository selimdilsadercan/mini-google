import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "crawler.db");
const g = global as any;
if (!g.dbInstance) {
  g.dbInstance = new Database(dbPath);
  // High-performance concurrency settings
  g.dbInstance.pragma('journal_mode = WAL');
  g.dbInstance.pragma('synchronous = NORMAL');
  g.dbInstance.pragma('busy_timeout = 5000'); // 5 second timeout for locked DB
  g.dbInstance.pragma('cache_size = -2000'); // 2MB cache
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
    FOREIGN KEY(crawler_id) REFERENCES crawlers(id) ON DELETE CASCADE
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
    FOREIGN KEY(crawler_id) REFERENCES crawlers(id) ON DELETE CASCADE
  );

  -- Logs for real-time monitoring
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crawler_id TEXT,
    message TEXT,
    level TEXT, -- info, warn, error
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(crawler_id) REFERENCES crawlers(id) ON DELETE CASCADE
  );

  -- Historical metrics snapshot
  CREATE TABLE IF NOT EXISTS system_metrics (
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_pages INTEGER,
    queue_depth INTEGER
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

// Initialize performance settings for high-scale crawling
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA busy_timeout = 5000;");

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
    return db.prepare("SELECT * FROM crawlers ORDER BY created_at DESC").all() as any[];
  },

  // Logging
  addLog: (crawlerId: string, message: string, level: string = "info") => {
    try {
      db.prepare(
        "INSERT INTO logs (crawler_id, message, level) VALUES (?, ?, ?)",
      ).run(crawlerId, message, level);
    } catch (e) {
      // Gracefully handle logs for IDs that don't exist in the 'crawlers' table (like 'Manager')
      console.log(`[DB-LOG-SKIPPED] ${crawlerId}: ${message}`);
    }
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
    // Escape single quotes for safety in query
    const escapedQuery = query.replace(/'/g, "''");
    const ftsQuery = `"${escapedQuery}"*`; 
    
    let depthFilter = "";
    const params: any[] = [];
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
        snippet(pages_search, 2, '<mark>', '</mark>', '...', 30) as snippet,
        bm25(pages_search, 10.0, 1.0) as bm25_rank,
        (CASE WHEN p.title LIKE '%${escapedQuery}%' THEN 5.0 ELSE 0.0 END) as title_boost
      FROM pages p
      JOIN pages_search ON p.url = pages_search.url
      LEFT JOIN crawlers c ON p.crawler_id = c.id
      WHERE pages_search MATCH ?
      ${depthFilter}
      ORDER BY (title_boost - bm25_rank) DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(...[ftsQuery, ...params]);
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

  getDomainDistribution: () => {
    return db.prepare(`
      SELECT 
        REPLACE(REPLACE(SUBSTR(url, INSTR(url, '//') + 2), 'www.', ''), SUBSTR(SUBSTR(url, INSTR(url, '//') + 2), INSTR(SUBSTR(url, INSTR(url, '//') + 2), '/')), '') as domain,
        COUNT(*) as count
      FROM pages
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 10
    `).all();
  },

  takeMetricsSnapshot: () => {
    const visited = db.prepare("SELECT COUNT(*) as count FROM pages").get() as any;
    const queue = db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'").get() as any;
    db.prepare("INSERT INTO system_metrics (total_pages, queue_depth) VALUES (?, ?)").run(visited.count, queue.count);
  },

  getHistory: () => {
    return db.prepare("SELECT * FROM system_metrics ORDER BY timestamp ASC LIMIT 100").all();
  },

  getStats: () => {
    const pages = db.prepare("SELECT COUNT(*) as count FROM pages").get() as any;
    const queue = db.prepare("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'").get() as any;
    return {
      visitedCount: pages.count,
      totalPages: pages.count,
      queueDepth: queue.count
    };
  },

  getQueueItemDepth: (crawlerId: string, url: string): number => {
    const res = db
      .prepare("SELECT depth FROM queue WHERE crawler_id = ? AND url = ?")
      .get(crawlerId, url) as any;
    return res ? res.depth : 0;
  },

  deleteCrawler: (id: string) => {
    db.transaction(() => {
      db.prepare("DELETE FROM logs WHERE crawler_id = ?").run(id);
      db.prepare("DELETE FROM queue WHERE crawler_id = ?").run(id);
      db.prepare("DELETE FROM pages WHERE crawler_id = ?").run(id);
      db.prepare("DELETE FROM crawlers WHERE id = ?").run(id);
    })();
  },
};
