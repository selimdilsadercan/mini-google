import { NextResponse } from "next/server";
import { manager } from "@/lib/crawler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 },
      );
    }

    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const depth = searchParams.get("depth")
      ? parseInt(searchParams.get("depth") as string)
      : undefined;

    const { results: rawResults, total } = manager.search(
      query,
      limit,
      offset,
      depth,
    ) || { results: [], total: 0 };

    // Group Results by Hostname to create "Site Links"
    const groupedResults: any[] = [];
    const hostnameMap = new Map<string, any>();

    rawResults.forEach((res: any) => {
      try {
        const urlObj = new URL(res.url);
        const hostname = urlObj.hostname;

        // Extract Base Domain (e.g., tr.wikipedia.org -> wikipedia.org)
        const domainParts = hostname.split(".");
        const baseDomain =
          domainParts.length > 2 ? domainParts.slice(-2).join(".") : hostname;

        if (!hostnameMap.has(baseDomain)) {
          const entry = {
            title: res.title || hostname,
            url: res.url,
            origin_url: res.origin_url,
            depth: res.depth,
            snippet: res.snippet,
            relevance_score: res.relevance_score,
            frequency: res.frequency,
            sub_links: [] as any[],
          };
          hostnameMap.set(baseDomain, entry);
          groupedResults.push(entry);
        } else {
          const entry = hostnameMap.get(baseDomain);
          // Limit sub-links to 4 and avoid duplicates
          if (entry.sub_links.length < 4 && entry.url !== res.url) {
            entry.sub_links.push({
              title: res.title || res.url,
              url: res.url,
            });
          }
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });

    return NextResponse.json({
      count: groupedResults.length,
      total: total,
      results: groupedResults,
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ count: 0, results: [] });
  }
}
