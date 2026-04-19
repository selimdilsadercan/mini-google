
const { manager } = require('./core/lib/crawler');

async function stressTest() {
    console.log('--- Starting Scale Stress Test ---');
    const origins = [
        'https://en.wikipedia.org/wiki/Main_Page',
        'https://github.com/trending',
        'https://techcrunch.com/',
        'https://news.ycombinator.com/',
        'https://www.bbc.com/news'
    ];

    console.log(`Initializing 5 simultaneous crawlers...`);
    const ids = origins.map((url, i) => {
        const id = manager.create(url, 2, 5); // depth 2, 5 req/s
        console.log(`  [${i+1}] Created crawler for ${url} with ID: ${id}`);
        return id;
    });

    console.log('Monitoring progress for 30 seconds...');
    for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const stats = manager.getAllJobStatuses();
        const totalPages = stats.reduce((acc, s) => acc + (s.visitedCount || 0), 0);
        console.log(`Progress [${(i+1)*5}s]: Total Pages Indexed: ${totalPages}`);
    }

    console.log('Stress test monitoring finished. Crawlers will continue in background if not stopped.');
}

stressTest().catch(console.error);
