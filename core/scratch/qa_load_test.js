
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'core/crawler.db');
const db = new Database(dbPath);

// Ensure settings match the project
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA busy_timeout = 5000;");

console.log('--- System Load & Integrity Test ---');

const WORKERS = 5;
const TARGET_INSERTS = 200; // Total per worker
let activeWorkers = WORKERS;

async function startWorker(id) {
    const crawlerId = `test-crawler-${id}`;
    console.log(`  [Worker ${id}] Starting...`);
    
    // Create the crawler record first to satisfy FK
    db.prepare("INSERT OR IGNORE INTO crawlers (id, origin, max_depth, hit_rate) VALUES (?, ?, ?, ?)").run(crawlerId, 'http://test.com', 2, 10);

    for (let i = 0; i < TARGET_INSERTS; i++) {
        try {
            const url = `http://test.com/page-${id}-${i}`;
            
            // 1. Add to logs
            db.prepare("INSERT INTO logs (crawler_id, message, level) VALUES (?, ?, ?)").run(crawlerId, `Crawled page ${i}`, 'info');
            
            // 2. Save page
            db.prepare("INSERT OR REPLACE INTO pages (url, crawler_id, depth, title, content) VALUES (?, ?, ?, ?, ?)")
              .run(url, crawlerId, 0, `Title ${i}`, `Content for page ${i}`);
              
            // 3. Update queue
            db.prepare("INSERT OR IGNORE INTO queue (url, crawler_id, depth) VALUES (?, ?, ?)")
              .run(url + '-next', crawlerId, 1);

            if (i % 50 === 0) console.log(`  [Worker ${id}] Progress: ${i}/${TARGET_INSERTS}`);
            
            // Small delay to simulate network/processing
            await new Promise(r => setTimeout(r, 10)); 
        } catch (e) {
            console.error(`  [Worker ${id}] Error at step ${i}:`, e.message);
            if (e.message.includes('locked')) {
                console.error('CRITICAL: Database Locked Error detected!');
            }
        }
    }
    
    console.log(`  [Worker ${id}] Finished.`);
    activeWorkers--;
}

async function run() {
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < WORKERS; i++) {
        promises.push(startWorker(i));
    }
    
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    console.log('\n--- Test Summary ---');
    console.log(`Duration: ${duration}ms`);
    
    const pageCount = db.prepare("SELECT COUNT(*) as count FROM pages WHERE url LIKE 'http://test.com/page-%'").get().count;
    console.log(`Pages inserted: ${pageCount}/${WORKERS * TARGET_INSERTS}`);
    
    const logCount = db.prepare("SELECT COUNT(*) as count FROM logs WHERE message LIKE 'Crawled page %'").get().count;
    console.log(`Logs inserted: ${logCount}`);

    // Cleanup
    console.log('Cleaning up test data...');
    db.prepare("DELETE FROM pages WHERE url LIKE 'http://test.com/page-%'").run();
    db.prepare("DELETE FROM logs WHERE message LIKE 'Crawled page %'").run();
    db.prepare("DELETE FROM queue WHERE url LIKE 'http://test.com/page-%'").run();
    db.prepare("DELETE FROM crawlers WHERE id LIKE 'test-crawler-%'").run();
    
    console.log('QA Load Test Finished Successfully.');
}

run().catch(console.error);
