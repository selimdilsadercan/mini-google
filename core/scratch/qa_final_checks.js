
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'crawler.db');
const db = new Database(dbPath);

console.log('--- QA Final Integrity & Performance Audit ---');

function checkDuplicates() {
    console.log('[Audit] Checking for URL duplicates across jobs...');
    const dupes = db.prepare("SELECT url, COUNT(*) as c FROM pages GROUP BY url HAVING c > 1").all();
    if (dupes.length === 0) {
        console.log('  - Success: No duplicate URLs found in pages table.');
    } else {
        console.log(`  - CRITICAL: Found ${dupes.length} duplicate URLs!`);
        console.log(JSON.stringify(dupes.slice(0, 5), null, 2));
    }
}

function testSearchLatency() {
    console.log('[Audit] Testing Search Latency...');
    const queries = ['google', 'technology', 'wiki', 'science', 'news'];
    
    queries.forEach(q => {
        const start = performance.now();
        // Simulate search with FTS5
        try {
            const results = db.prepare(`
                SELECT p.url, p.title 
                FROM pages p
                JOIN pages_search ON p.url = pages_search.url
                WHERE pages_search MATCH ?
                LIMIT 20
            `).all(`"${q}"*`);
            const end = performance.now();
            console.log(`  - Search for "${q}": ${results.length} results in ${(end - start).toFixed(2)}ms`);
        } catch (e) {
            console.log(`  - Search for "${q}" failed: ${e.message}`);
        }
    });
}

function checkOrphanedData() {
    console.log('[Audit] Checking for orphaned data (FK Integrity Check)...');
    const orphans = db.prepare("SELECT COUNT(*) as c FROM pages WHERE crawler_id NOT IN (SELECT id FROM crawlers)").get().c;
    if (orphans === 0) {
        console.log('  - Success: Zero orphaned pages (all belong to valid crawlers).');
    } else {
        console.log(`  - WARNING: ${orphans} pages have no corresponding crawler record.`);
    }
}

checkDuplicates();
checkOrphanedData();
testSearchLatency();

console.log('--- Audit Finished ---');
