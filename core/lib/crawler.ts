import * as cheerio from 'cheerio';
import { dbService } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid required

class CrawlJob {
  public id: string;
  public origin: string;
  public maxDepth: number;
  public onlyExternalDomains: boolean;
  private isRunning: boolean = true;
  private activeRequests: number = 0;
  private maxConcurrent: number = 5;
  private delay: number; // ms

  constructor(id: string, origin: string, maxDepth: number, hitRate: number, onlyExternalDomains: boolean = false) {
    this.id = id;
    this.origin = origin;
    this.maxDepth = maxDepth;
    this.delay = Math.floor(1000 / hitRate);
    this.onlyExternalDomains = onlyExternalDomains;
    log(this.id, `Job initialized for ${origin} with max depth ${maxDepth}, hit rate ${hitRate}/s, external only: ${onlyExternalDomains}`);
  }

  public async start() {
    dbService.updateCrawlerStatus(this.id, 'running');
    dbService.addToQueue(this.id, this.origin, 0);
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
          this.crawlPage(job).finally(() => {
            this.activeRequests--;
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

  private async crawlPage(target: { url: string; depth: number }) {
    try {
      log(this.id, `Fetching: ${target.url} (Depth: ${target.depth})`);
      const response = await fetch(target.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        dbService.updateQueueStatus(this.id, target.url, 'error');
        log(this.id, `Failed to fetch ${target.url} (Status: ${response.status})`, 'error');
        return;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Target ONLY the primary head title to avoid SVG/Icon titles
      const title = $('head title').first().text().trim() || 
                    $('title').first().text().trim() ||
                    $('h1').first().text().trim() || 
                    $('meta[property="og:title"]').attr('content') || 
                    new URL(target.url).pathname.split('/').pop() || 
                    'Untitled Page';
                    
      // Clean up the page before extracting text
      $('script, style, noscript, svg, path, link').remove();
      
      const content = $('body')
        .text()
        .replace(/\s+/g, ' ') // Collapse whitespaces
        .trim();
      
      dbService.savePage(this.id, target.url, target.depth, title, content);
      dbService.updateQueueStatus(this.id, target.url, 'completed');
      log(this.id, `Indexed ${target.url} successfully`);

      if (target.depth < this.maxDepth) {
        let discoveredCount = 0;
       // Junk/Meta Link Filter
      const isJunk = (url: string) => {
        const junkPatterns = [
          'action=edit', 'veaction=edit', 'action=history', 'diff=', 
          '/wiki/Vikipedi:', '/wiki/Special:', '/wiki/Dosya:', '/wiki/Kategori:',
          '/wiki/Help:', '/wiki/Tart%C4%B1%C5%9Fma:', '/wiki/User:',
          'oldid=', 'redirect=no', '.php', 'auth', 'login'
        ];
        return junkPatterns.some(p => url.includes(p));
      };

      const links = $('a').map((i, el) => {
        const href = $(el).attr('href');
        if (!href) return null;
        try {
          const abs = new URL(href, target.url).href.split('#')[0];
          
          if (this.onlyExternalDomains) {
            try {
              const currentHost = new URL(target.url).hostname;
              const linkHost = new URL(abs).hostname;
              // If hosts match (even roughly), skip it
              if (currentHost.replace('www.', '') === linkHost.replace('www.', '')) {
                return null;
              }
            } catch (e) { return null; }
          }

          if (isJunk(abs) || !abs.startsWith('http')) return null; // Skip junk links or non-http links
          return abs;
        } catch (e) {
          return null;
        }
      }).get().filter(Boolean);

      for (const link of links) {
        dbService.addToQueue(this.id, link, target.depth + 1);
        discoveredCount++;
      }

        if (discoveredCount > 0) log(this.id, `Found ${discoveredCount} new potential links on ${target.url}`);
      }
    } catch (e: any) {
      log(this.id, `Error crawling ${target.url}: ${e.message}`, 'error');
      dbService.updateQueueStatus(this.id, target.url, 'error');
    }
  }
}

function log(crawlerId: string, message: string, level: string = 'info') {
  console.log(`[Crawler:${crawlerId}] ${message}`);
  dbService.addLog(crawlerId, message, level);
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
  }
}

export const manager: CrawlerManager = g.crawlerManager || new CrawlerManager();
if (process.env.NODE_ENV !== 'production') g.crawlerManager = manager;
