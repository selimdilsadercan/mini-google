
const Database = require('better-sqlite3');
const path = require('path');

// REAL DB path (based on my findings)
const dbPath = path.resolve(process.cwd(), 'core/crawler.db');
const db = new Database(dbPath);

console.log('--- QA Test Suite Running ---');

function testDeduplication() {
    console.log('[Test] Deduplication...');
    const url = 'https://test-qa-unique.com';
    try {
        db.prepare("INSERT INTO pages (url, crawler_id, depth, title, content) VALUES (?, ?, ?, ?, ?)").run(url, 'test-id', 0, 'Title', 'Content');
        console.log('  - First insert OK');
        db.prepare("INSERT INTO pages (url, crawler_id, depth, title, content) VALUES (?, ?, ?, ?, ?)").run(url, 'test-id', 0, 'Title 2', 'Content 2');
        console.log('  - Error: Second insert worked (Deduplication FAILED)');
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            console.log('  - Success: Caught duplicate URL insertion error');
        } else {
            console.log('  - Unexpected Error:', e.message);
        }
    } finally {
        db.prepare("DELETE FROM pages WHERE url = ?").run(url);
    }
}

function testForeignKeyConstraint() {
    console.log('[Test] Foreign Key Constraint...');
    const invalidId = 'non-existent-crawler-' + Date.now();
    
    // Check if foreign keys are enabled in this connection
    db.exec("PRAGMA foreign_keys = ON;");
    const fkStatus = db.prepare("PRAGMA foreign_keys").get().foreign_keys;
    console.log('  - Connection Foreign Keys status:', fkStatus === 1 ? 'ON' : 'OFF');

    try {
        db.prepare("INSERT INTO logs (crawler_id, message, level) VALUES (?, ?, ?)").run(invalidId, 'Test message', 'info');
        console.log('  - Error: Insert log with non-existent crawler_id worked (FK enforcement MISSING)');
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            console.log('  - Success: Caught foreign key violation error');
        } else {
            console.log('  - Error:', e.message);
        }
    }
}

function auditData() {
    console.log('[Audit] Data Stats...');
    const tableExists = (name) => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    
    if (tableExists('pages')) {
        const dupes = db.prepare("SELECT url, COUNT(*) as count FROM pages GROUP BY url HAVING count > 1").all();
        console.log(`  - Duplicate URLs in DB: ${dupes.length}`);
    }
    
    if (tableExists('logs')) {
        const orphanedLogs = db.prepare("SELECT COUNT(*) as count FROM logs WHERE crawler_id NOT IN (SELECT id FROM crawlers)").get().count;
        console.log(`  - Orphaned logs (no parent crawler): ${orphanedLogs}`);
    }
}

testDeduplication();
testForeignKeyConstraint();
auditData();

console.log('--- QA Test Suite Finished ---');
