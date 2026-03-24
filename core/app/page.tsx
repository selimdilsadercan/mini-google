'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface SearchLink {
  title: string;
  url: string;
}

interface SearchResult {
  title: string;
  url: string;
  origin_url: string;
  depth: number;
  snippet?: string;
  sub_links?: SearchLink[];
  relevance_score?: number;
}

const PAGE_SIZE = 10;

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [depthFilter, setDepthFilter] = useState<number | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<{ text: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Suggestions debounced fetch
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside suggestions to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToHistory = (q: string) => {
    const newHistory = [q, ...history.filter(item => item !== q)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (e?: React.FormEvent, newOffset = 0, isLoadMore = false) => {
    if (e) e.preventDefault();
    if (!query) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setSearching(true);
      setOffset(0);
      setResults([]);
    }

    setShowSuggestions(false);
    const startTime = performance.now();

    try {
      const url = `/api/search?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${newOffset}${depthFilter !== undefined ? `&depth=${depthFilter}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      
      if (isLoadMore) {
        setResults(prev => [...prev, ...(data.results || [])]);
      } else {
        setResults(data.results || []);
        setTotal(data.total || 0);
        setSearchTime((performance.now() - startTime) / 1000);
        addToHistory(query);
      }
      setOffset(newOffset);
    } catch (err) {
      console.error('Search failed', err);
      if (!isLoadMore) setResults([]);
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    // Trigger search immediately
    setTimeout(() => handleSearch(undefined, 0, false), 0);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search_history');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 font-sans selection:bg-blue-500/30">
      {/* Admin Link at the top right */}
      <nav className="fixed top-8 right-8 z-50">
        <Link 
          href="/admin" 
          className="text-xs font-bold text-slate-500 hover:text-blue-400 transition-all border border-slate-800 hover:border-blue-500/50 rounded-full px-5 py-2 backdrop-blur-sm bg-slate-950/50"
        >
          ⚙️ Crawler Dashboard
        </Link>
      </nav>

      <main className={`w-full max-w-4xl mx-auto transition-all duration-700 ${results.length > 0 || searching ? 'mt-8' : 'mt-[20vh] flex flex-col items-center'}`}>
        {/* Modern Logo */}
        <div className={`transition-all duration-500 mb-8 ${results.length > 0 || searching ? 'scale-50 origin-left mb-4 flex items-center gap-4' : 'scale-100 text-center'}`}>
          <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent cursor-pointer" onClick={() => { setResults([]); setQuery(''); setSearching(false); }}>
            Mini-Google
          </h1>
          {(results.length > 0 || searching) && <p className="text-slate-500 font-medium tracking-widest uppercase text-[10px] mt-4">Search Engine</p>}
          {!results.length && !searching && <p className="text-slate-500 mt-2 font-medium tracking-widest uppercase text-[10px]">Indexed Web Explorer</p>}
        </div>

        {/* Search Bar Container */}
        <div className="relative w-full max-w-2xl">
          <form onSubmit={(e) => handleSearch(e)} className="relative w-full group">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              autoFocus
              className={`w-full bg-slate-900/50 border-2 border-slate-800 rounded-3xl px-16 py-5 text-xl outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all shadow-2xl group-hover:border-slate-700 ${searching ? 'animate-pulse' : ''}`}
              placeholder="Search the indexed web..."
            />
            <svg 
              className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-500 group-focus-within:text-blue-500 transition-all"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {query && (
                <button 
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-20 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
            <button type="submit" className="absolute right-6 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white font-bold p-2.5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </form>

          {/* Autocomplete & History Dropdown */}
          {showSuggestions && (query.length > 0 || history.length > 0) && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {query.length > 0 && suggestions.length > 0 && (
                <div className="py-2 border-b border-slate-800/50">
                  <p className="px-5 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest">Suggestions</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s.text)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-800 flex items-center gap-3 transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <span className="text-slate-300 font-medium">{s.text}</span>
                    </button>
                  ))}
                </div>
              )}
              {history.length > 0 && (
                <div className="py-2">
                  <div className="px-5 py-1 flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Recent Searches</p>
                    <button onClick={clearHistory} className="text-[10px] text-blue-500 hover:text-blue-400 font-bold uppercase transition-colors">Clear</button>
                  </div>
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(h)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-800 flex items-center gap-3 transition-colors group"
                    >
                      <svg className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{h}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats and Filters */}
        {(results.length > 0 || searching) && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-4 animate-in fade-in duration-500">
            <p className="text-slate-500 text-sm font-medium">
              About <span className="text-slate-300 font-bold">{total}</span> indexed results found ({searchTime.toFixed(3)} seconds)
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mr-2">Filter By Depth:</span>
              <button 
                onClick={() => { setDepthFilter(undefined); setTimeout(() => handleSearch(), 0); }}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${depthFilter === undefined ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
              >
                All
              </button>
              {[0, 1, 2, 3].map(d => (
                <button 
                  key={d}
                  onClick={() => { setDepthFilter(d); setTimeout(() => handleSearch(), 0); }}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${depthFilter === d ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  H{d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Container */}
        <div className="mt-8 space-y-12 w-full">
          {searching ? (
            /* Skeleton Loading State */
            <div className="space-y-12 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-900 rounded-sm"></div>
                    <div className="h-3 w-48 bg-slate-900 rounded-full"></div>
                  </div>
                  <div className="h-7 w-2/3 bg-slate-800 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-900 rounded-lg"></div>
                    <div className="h-4 w-5/6 bg-slate-900 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-12">
              {results.map((res, idx) => (
                <div key={idx} className="group animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative group/fav">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(res.url).hostname}&sz=64`}
                        alt=""
                        className="w-5 h-5 rounded-sm bg-white"
                        loading="lazy"
                      />
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black border ${res.depth === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      H{res.depth}
                    </div>
                    <span className="text-slate-500 text-xs truncate max-w-md font-mono hover:text-slate-300 transition-colors cursor-default">{res.url}</span>
                  </div>
                  <div className="mb-4">
                    <a 
                      href={res.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-2xl font-black text-blue-400 group-hover:text-indigo-400 transition-all tracking-tight inline-block hover:underline decoration-2 underline-offset-4"
                    >
                      {res.title || 'Untitled Discovery'}
                    </a>
                    {res.snippet && (
                      <p 
                        className="text-slate-400 text-sm mt-2 leading-relaxed max-w-3xl line-clamp-3 group-hover:text-slate-300 transition-colors"
                        dangerouslySetInnerHTML={{ __html: res.snippet }}
                      />
                    )}
                    <div className="text-slate-500 text-[10px] mt-3 flex items-center gap-3 font-bold uppercase tracking-wider">
                      <span>Source: <span className="text-slate-400 italic">{new URL(res.url).hostname}</span></span>
                      <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                      <span>Discovery origin: <span className="text-slate-400 italic truncate max-w-[150px] inline-block align-bottom">{res.origin_url}</span></span>
                    </div>
                  </div>

                  {/* Google-style Site Links Grid */}
                  {res.sub_links && res.sub_links.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-6 ml-6 border-l-2 border-slate-900 pl-6 group-hover:border-indigo-500/30 transition-colors">
                      {res.sub_links.map((link, lidx) => (
                        <div key={lidx} className="group/link flex flex-col">
                          <a 
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 group-hover/link:translate-x-1 transition-transform"
                          >
                            <span className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full group-hover/link:bg-blue-400 group-hover/link:animate-pulse"></span>
                            <span className="truncate">{link.title.replace(`${new URL(res.url).hostname} - `, '').split(' - ')[0] || link.url}</span>
                          </a>
                          <p className="text-[10px] text-slate-600 mt-0.5 truncate max-w-xs font-mono ml-3.5">
                            {link.url}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {results.length < total && (
                <div className="pt-8 pb-16 flex justify-center">
                  <button 
                    onClick={() => handleSearch(undefined, offset + PAGE_SIZE, true)}
                    disabled={loadingMore}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-black px-12 py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 group"
                  >
                    {loadingMore ? (
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    )}
                    {loadingMore ? 'CRAWLING MORE...' : 'LOAD MORE RESULTS'}
                  </button>
                </div>
              )}
            </div>
          ) : query && !searching && (
            <div className="text-center py-24 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                    <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              <p className="text-slate-400 text-xl font-medium">No results discovered in the local index</p>
              <p className="text-slate-600 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                The crawler hasn't reached this part of the web yet. You can 
                <Link href="/admin" className="text-blue-500 hover:text-blue-400 font-bold underline px-1 transition-colors">initiate a new crawl</Link> 
                to index more content.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                  <button 
                    onClick={() => { setQuery('Wikipedia'); setTimeout(() => handleSearch(), 0); }}
                    className="text-[10px] font-black text-slate-600 hover:text-blue-400 transition-colors border border-slate-900 hover:border-blue-500/30 rounded-full px-4 py-2 uppercase tracking-widest"
                  >
                    Try "Wikipedia"
                  </button>
                  <button 
                    onClick={() => { setQuery('Python'); setTimeout(() => handleSearch(), 0); }}
                    className="text-[10px] font-black text-slate-600 hover:text-blue-400 transition-colors border border-slate-900 hover:border-blue-500/30 rounded-full px-4 py-2 uppercase tracking-widest"
                  >
                    Try "Python"
                  </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Subtle Footer */}
      {!results.length && !searching && (
        <footer className="fixed bottom-10 left-0 right-0 text-center text-slate-800 text-[10px] font-black tracking-[0.2em] uppercase pointer-events-none">
          Mini-Google Agentic Crawler Engine v1.2
        </footer>
      )}
    </div>
  );
}
