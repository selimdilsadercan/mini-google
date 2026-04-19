import { dbService } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Worker } from 'worker_threads';
import path from 'path';

class CrawlJob {
  public id: string;
  public origin: string;
  public maxDepth: number;
  public onlyExternalDomains: boolean;
  private isRunning: boolean = true;
  private activeRequests: number = 0;
  private maxConcurrent: number = 5;
  private delay: number; // ms
  private worker: Worker;

  constructor(id: string, origin: string, maxDepth: number, hitRate: number, onlyExternalDomains: boolean = false) {
    this.id = id;
    this.origin = origin;
    this.maxDepth = maxDepth;
    this.delay = Math.floor(1000 / hitRate);
    this.onlyExternalDomains = onlyExternalDomains;

    // Initialize Worker
    const workerPath = path.resolve(process.cwd(), 'lib/worker.ts');
    this.worker = new Worker(workerPath, { execArgv: ['--conditions', 'typescript'] }); // Support TS via Bun/Loader
    
    this.worker.on('message', (msg) => {
      if (msg.type === 'RESULT') {
        this.handleWorkerResult(msg.url, msg.data);
      } else if (msg.type === 'ERROR') {
        this.handleWorkerError(msg.url, msg.error);
      }
    });

    this.worker.on('error', (err) => {
      log(this.id, `Worker Critical Error: ${err.message}`, 'error');
    });

    log(this.id, `Job initialized with worker. Origin: ${origin}, Depth: ${maxDepth}`);
  }

  public async start(isResume: boolean = false) {
    dbService.updateCrawlerStatus(this.id, 'running');
    if (!isResume) {
      dbService.addToQueue(this.id, this.origin, 0);
    }
    this.processQueue();
  }

  public stop() {
    this.isRunning = false;
    dbService.updateCrawlerStatus(this.id, 'stopped');
    log(this.id, 'Job stopped by user', 'warn');
  }

  private async processQueue() {
    while (this.isRunning) {
      if (this.activeRequests < this.maxConcurrent) {
        const job = dbService.getNextFromQueue(this.id);
        
        if (job) {
          this.activeRequests++;
          dbService.updateQueueStatus(this.id, job.url, 'processing');
          this.worker.postMessage({ 
            type: 'CRAWL', 
            url: job.url, 
            onlyExternalDomains: this.onlyExternalDomains,
            depth: job.depth 
          });
        } else if (this.activeRequests === 0) {
          // Finished
          this.isRunning = false;
          dbService.updateCrawlerStatus(this.id, 'finished');
          log(this.id, 'Crawling process finished successfully');
          break;
        }
      }
      await new Promise(r => setTimeout(r, this.delay));
    }
  }

  private handleWorkerResult(url: string, data: any) {
    const { title, content, links } = data;
    const currentDepth = dbService.getQueueItemDepth(this.id, url);
    
    dbService.savePage(this.id, url, currentDepth, title, content);
    dbService.updateQueueStatus(this.id, url, 'completed');
    
    if (currentDepth < this.maxDepth) {
      for (const link of links) {
        dbService.addToQueue(this.id, link, currentDepth + 1);
      }
    }
    
    this.activeRequests--;
    log(this.id, `Indexed ${url} (Worker)`);
  }

  private handleWorkerError(url: string, error: string) {
    log(this.id, `Error crawling ${url}: ${error}`, 'error');
    dbService.updateQueueStatus(this.id, url, 'error');
    this.activeRequests--;
  }

  public stop() {
    this.isRunning = false;
    this.worker.terminate();
    dbService.updateCrawlerStatus(this.id, 'stopped');
    log(this.id, 'Job stopped and worker terminated', 'warn');
  }
}

function log(crawlerId: string, message: string, level: string = 'info') {
  console.log(`[Crawler:${crawlerId}] ${message}`);
  if (crawlerId !== 'Manager') {
    dbService.addLog(crawlerId, message, level);
  }
}

class CrawlerManager {
  private jobs: Map<string, CrawlJob> = new Map();

  public create(origin: string, depth: number, hitRate: number, onlyExternalDomains: boolean = false): string {
    const id = uuidv4().split('-')[0]; // Short UUID
    dbService.createCrawler(id, origin, depth, hitRate);
    const job = new CrawlJob(id, origin, depth, hitRate, onlyExternalDomains);
    this.jobs.set(id, job);
    job.start();
    return id;
  }

  public rehydrateJobs() {
    const activeCrawlers = dbService.listCrawlers().filter((c: any) => c.status === 'running');
    log('Manager', `Rehydrating ${activeCrawlers.length} active jobs...`);
    
    for (const crawler of activeCrawlers) {
      const job = new CrawlJob(crawler.id, crawler.origin, crawler.max_depth, crawler.hit_rate);
      this.jobs.set(crawler.id, job);
      job.start(true); // Resume without re-adding origin
    }
  }

  public stopJob(id: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
    } else {
      dbService.updateCrawlerStatus(id, "stopped");
    }
  }

  public deleteJob(id: string) {
    this.stopJob(id);
    dbService.deleteCrawler(id);
  }

  public getStats(id: string) {
    return dbService.getCrawlerStats(id);
  }

  public getAllJobStatuses() {
    return dbService.listCrawlers();
  }

  public search(query: string, limit = 20, offset = 0, depth?: number) {
    const results = dbService.search(query, limit, offset, depth);
    const total = dbService.countResults(query, depth);
    return { results, total };
  }

  public getSuggestions(query: string) {
    return dbService.getSuggestions(query);
  }

  public getLogs(id: string) {
    return dbService.getLogs(id);
  }
}

// Global instance for Next.js hot-reload
const g = global as any;

if (process.env.NODE_ENV !== 'production') {
  if (!g.crawlerManager || !g.crawlerManager.getSuggestions) {
    g.crawlerManager = new CrawlerManager();
    g.crawlerManager.rehydrateJobs();
    
    // Automatic metrics collection (every 5 minutes)
    setInterval(() => {
      dbService.takeMetricsSnapshot();
    }, 1000 * 60 * 5);
  }
}

export const manager: CrawlerManager = g.crawlerManager || new CrawlerManager();
if (process.env.NODE_ENV !== 'production') {
  g.crawlerManager = manager;
} else {
  // Production auto-resume
  manager.rehydrateJobs();
}
