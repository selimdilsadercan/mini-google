import { parentPort, workerData } from 'worker_threads';
import * as cheerio from 'cheerio';

/**
 * Worker thread for isolatied web crawling.
 * Handles: Fetching, HTML Parsing, Link extraction.
 */

async function crawlPage(url: string, onlyExternalDomains: boolean, targetUrl: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Metadata extraction
    const title = $('head title').first().text().trim() || 
                  $('title').first().text().trim() ||
                  $('h1').first().text().trim() || 
                  'Untitled Page';

    $('script, style, noscript, svg, path, link, footer, nav, header, aside').remove();
    
    const content = ($('main').first().length ? $('main').first().text() : $('body').text())
      .replace(/\s+/g, ' ')
      .trim();

    // Link extraction
    const discoveredLinks: string[] = [];
    const isJunk = (u: string) => ['action=edit', 'action=history', '/wiki/Special:', 'login'].some(p => u.includes(p));

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const abs = new URL(href, url).href.split('#')[0];
        if (!abs.startsWith('http') || isJunk(abs)) return;

        if (onlyExternalDomains) {
          const currentHost = new URL(url).hostname;
          const linkHost = new URL(abs).hostname;
          if (currentHost.replace('www.', '') === linkHost.replace('www.', '')) return;
        }

        discoveredLinks.push(abs);
      } catch (e) {}
    });

    return { title, content, links: [...new Set(discoveredLinks)] };
  } catch (error: any) {
    throw error;
  }
}

if (parentPort) {
  parentPort.on('message', async (message) => {
    if (message.type === 'CRAWL') {
      try {
        const result = await crawlPage(message.url, message.onlyExternalDomains, message.targetUrl);
        parentPort?.postMessage({ type: 'RESULT', data: result, url: message.url });
      } catch (error: any) {
        parentPort?.postMessage({ type: 'ERROR', error: error.message, url: message.url });
      }
    }
  });
}
