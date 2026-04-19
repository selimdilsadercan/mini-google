
import { manager } from './lib/crawler';

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
        const crawlers = manager.getAllJobStatuses();
        let totalVisited = 0;
        let totalQueue = 0;
        
        for (const c of crawlers) {
            const stats = manager.getStats(c.id);
            totalVisited += stats.visitedCount;
            totalQueue += stats.queueDepth;
        }
        
        console.log(`Progress [${(i+1)*5}s]: Total Pages: ${totalVisited}, Queue: ${totalQueue}`);
    }

    console.log('Stopping all test crawlers...');
    ids.forEach(id => manager.stopJob(id));
    console.log('Stress test finished.');
}

stressTest().catch(console.error);
