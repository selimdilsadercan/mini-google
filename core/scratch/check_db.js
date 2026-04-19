
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'crawler.db');
const db = new Database(dbPath);

console.log('--- Database Audit ---');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const crawlersCount = db.prepare("SELECT COUNT(*) as count FROM crawlers").get().count;
console.log('Crawlers count:', crawlersCount);

const pagesCount = db.prepare("SELECT COUNT(*) as count FROM pages").get().count;
console.log('Pages count:', pagesCount);

const lastLogs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 5").all();
console.log('Last 5 logs:', JSON.stringify(lastLogs, null, 2));

const foreignKeyEnforcement = db.prepare("PRAGMA foreign_keys").get().foreign_keys;
console.log('Foreign key enforcement:', foreignKeyEnforcement === 1 ? 'ON' : 'OFF');
