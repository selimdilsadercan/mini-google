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
  const [searchStatus, setSearchStatus] = useState("Analyzing request...");
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

  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const agentMessages = [
    "Analyzing search intent...",
    "Traversing web graph...",
    "Extracting semantic patterns...",
    "Relating entities...",
    "Optimizing rank scores...",
    "Scanning indexed clusters...",
    "Synthesizing results...",
    "Filtering noise...",
    "Cross-referencing meta-data...",
    "Navigating digital synapses..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (searching) {
      setSearchStatus("Initializing deep discovery...");
      interval = setInterval(() => {
        const randomMsg = agentMessages[Math.floor(Math.random() * agentMessages.length)];
        setSearchStatus(randomMsg);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [searching]);

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
    setTimeout(() => handleSearch(undefined, 0, false), 0);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search_history');
  };

  const hasResults = results.length > 0 || searching;

  return (
    <div className="min-h-screen bg-mesh flex flex-col selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20 z-0"></div>
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-end">
        <Link 
          href="/admin" 
          className="glass px-5 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-white hover:border-blue-500/50 transition-all flex items-center gap-2 group"
        >
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          ADMIN DASHBOARD
          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </Link>
      </nav>

      {/* Background Orbs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <main className={`flex-1 w-full max-w-5xl mx-auto px-6 transition-all duration-1000 ease-in-out ${hasResults ? 'pt-24 pb-20' : 'flex flex-col items-center justify-center'}`}>
        
        {/* Logo Section */}
        <div className={`transition-all duration-1000 ${hasResults ? 'fixed top-6 left-6 z-50 scale-50 origin-left flex items-center gap-4' : 'mb-12 text-center'}`}>
          <div className="relative inline-block group" onClick={() => { setResults([]); setQuery(''); setSearching(false); }}>
            <h1 className="text-8xl font-black tracking-tighter cursor-pointer select-none">
              <span className="bg-gradient-to-br from-white via-blue-400 to-indigo-600 bg-clip-text text-transparent drop-shadow-2xl">Mini</span>
              <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">G</span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
          </div>
          {!hasResults && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="h-[1px] w-8 bg-slate-800"></div>
              <p className="text-slate-500 font-bold tracking-[0.3em] uppercase text-[10px]">Agentic Web Intelligence</p>
              <div className="h-[1px] w-8 bg-slate-800"></div>
            </div>
          )}
        </div>

        {/* Search Bar Section */}
        <div className={`w-full max-w-2xl mx-auto transition-all duration-1000 ${hasResults ? 'mb-8' : 'animate-float'}`}>
          <div className="relative group">
            <form onSubmit={(e) => handleSearch(e)} className="relative z-10">
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
                className={`w-full glass rounded-[2.5rem] px-16 py-6 text-xl text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all shadow-2xl group-hover:border-slate-700 placeholder:text-slate-600 ${searching ? 'cursor-wait' : ''}`}
                placeholder="Explore the indexed web..."
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {query && (
                  <button 
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-3 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </form>

            {/* Suggestions Overlay */}
            {showSuggestions && (query.length > 0 || history.length > 0) && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-4 right-4 mt-3 glass rounded-3xl shadow-2xl overflow-hidden z-[100] border-white/5 animate-in fade-in slide-in-from-top-4 duration-300"
              >
                {query.length > 0 && suggestions.length > 0 && (
                  <div className="p-2">
                    <div className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">Suggestions</div>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s.text)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-500/10 rounded-2xl flex items-center gap-3 transition-colors group/item"
                      >
                        <svg className="w-4 h-4 text-slate-600 group-hover/item:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <span className="text-slate-300 font-medium group-hover/item:text-white">{s.text}</span>
                      </button>
                    ))}
                  </div>
                )}
                {history.length > 0 && (
                  <div className="p-2 bg-white/[0.02]">
                    <div className="px-4 py-2 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">
                      <span>Recent History</span>
                      <button onClick={clearHistory} className="text-blue-500 hover:text-blue-400 font-bold">CLEAR</button>
                    </div>
                    {history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(h)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-2xl flex items-center gap-3 transition-colors group/hist"
                      >
                        <svg className="w-4 h-4 text-slate-600 group-hover/hist:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-slate-400 group-hover/hist:text-slate-200">{h}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats & Filters Bar */}
        {hasResults && (
          <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-b border-white/5 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 glass rounded-full text-[10px] font-bold text-blue-400 border-blue-500/20">
                {total} RESULTS
              </div>
              <p className="text-slate-500 text-xs font-medium tracking-tight">
                Discovered in <span className="text-slate-300">{searchTime.toFixed(3)}s</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 glass rounded-xl border-white/5">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3">Depth:</span>
              <button 
                onClick={() => { setDepthFilter(undefined); setTimeout(() => handleSearch(), 0); }}
                className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all ${depthFilter === undefined ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-200'}`}
              >
                All
              </button>
              {[0, 1, 2, 3].map(d => (
                <button 
                  key={d}
                  onClick={() => { setDepthFilter(d); setTimeout(() => handleSearch(), 0); }}
                  className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all ${depthFilter === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-200'}`}
                >
                  H{d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="mt-8 space-y-8 w-full">
          {searching ? (
            <div className="space-y-8 animate-pulse">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                  <div className="h-1 w-64 bg-white/5 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent w-full animate-shimmer"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-mono text-xs tracking-widest uppercase">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                  {searchStatus}
                </div>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-8 space-y-4">
                  <div className="flex items-center gap-3"><div className="w-6 h-6 bg-white/5 rounded"></div><div className="h-4 w-48 bg-white/5 rounded-full"></div></div>
                  <div className="h-8 w-3/4 bg-white/10 rounded-xl"></div>
                  <div className="space-y-2"><div className="h-4 w-full bg-white/5 rounded-lg"></div><div className="h-4 w-5/6 bg-white/5 rounded-lg"></div></div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-6">
              {results.map((res, idx) => (
                <div 
                  key={idx} 
                  className="glass-card p-10 group relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 glass rounded-xl flex items-center justify-center border-white/5 relative group-hover:border-blue-500/30 transition-all">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${new URL(res.url).hostname}&sz=64`}
                          alt="" className="w-5 h-5 rounded-sm" loading="lazy"
                        />
                        <div className="absolute -inset-1 bg-blue-500/5 blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{new URL(res.url).hostname}</span>
                        <span className="text-slate-600 text-[9px] font-mono truncate max-w-sm">{res.url}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Confid.</span>
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${Math.max(30, 100 - (res.depth * 20))}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-md text-[9px] font-black tracking-tighter border ${res.depth === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        HOP 0{res.depth}
                      </div>
                    </div>
                  </div>

                  <a 
                    href={res.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-2xl font-black text-white hover:text-blue-400 transition-colors leading-tight block mb-3 decoration-blue-500/30 underline-offset-8 group-hover:underline"
                  >
                    {res.title || 'Untitled Discovery'}
                  </a>

                  {res.snippet && (
                    <p 
                      className="text-slate-400 text-sm leading-relaxed max-w-3xl line-clamp-3 group-hover:text-slate-300 transition-colors"
                      dangerouslySetInnerHTML={{ __html: res.snippet }}
                    />
                  )}

                  {res.sub_links && res.sub_links.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 mt-8 pt-6 border-t border-white/5">
                      {res.sub_links.map((link, lidx) => (
                        <a 
                          key={lidx} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="group/link flex flex-col gap-1 transition-all"
                        >
                          <span className="text-sm font-bold text-blue-400/80 group-hover/link:text-blue-300 flex items-center gap-2">
                            <span className="w-1 h-1 bg-blue-500/30 rounded-full group-hover/link:scale-150 transition-transform"></span>
                            {link.title.replace(`${new URL(res.url).hostname} - `, '').split(' - ')[0] || 'Sub-page'}
                          </span>
                          <span className="text-[10px] text-slate-600 truncate ml-3 font-mono">{link.url}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 glass rounded-xl border-white/5 flex items-center gap-3 group/map hover:border-blue-500/20 transition-all cursor-default">
                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Connectivity Map</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-400/70 font-mono truncate max-w-[100px]">{new URL(res.origin_url).hostname}</span>
                          <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          <span className="text-[10px] text-slate-400 font-mono">Node #{res.depth}</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-[9px] font-black text-blue-500 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center gap-2 px-5 py-2.5 glass rounded-full border-blue-500/20 hover:border-blue-500/50 group/intel">
                      View Intelligence
                      <svg className="w-3 h-3 group-hover/intel:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Load More Section */}
              {results.length < total && (
                <div className="pt-12 pb-24 flex justify-center">
                  <button 
                    onClick={() => handleSearch(undefined, offset + PAGE_SIZE, true)}
                    disabled={loadingMore}
                    className="glass px-16 py-5 rounded-2xl text-slate-300 font-black tracking-widest text-xs hover:border-blue-500 transition-all hover:text-white disabled:opacity-50 flex items-center gap-4 group"
                  >
                    {loadingMore ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                    ) : (
                        <svg className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    )}
                    {loadingMore ? 'SYNCING INDEX...' : 'LOAD MORE DATA'}
                  </button>
                </div>
              )}
            </div>
          ) : query && !searching && (
            <div className="text-center py-32 animate-in zoom-in duration-700">
                <div className="w-24 h-24 glass rounded-full flex items-center justify-center mx-auto mb-8 border-white/5 relative">
                    <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full"></div>
                    <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              <h2 className="text-2xl font-black text-white mb-4">No results in local intelligence</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed font-medium">
                Our crawlers haven't reached this sector yet. Start a new discovery mission in the dashboard.
              </p>
              <div className="mt-12 flex flex-wrap justify-center gap-4">
                  {['Wikipedia', 'Python', 'React'].map(tag => (
                    <button 
                      key={tag} onClick={() => { setQuery(tag); setTimeout(() => handleSearch(), 0); }}
                      className="glass px-6 py-2.5 rounded-full text-[10px] font-black text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all uppercase tracking-widest"
                    >
                      Search "{tag}"
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Futuristic Footer */}
      {!hasResults && (
        <footer className="fixed bottom-12 left-0 right-0 flex flex-col items-center gap-4 pointer-events-none opacity-40">
          <div className="flex gap-8 text-[9px] font-black text-slate-700 tracking-[0.2em] uppercase">
            <span>Distributed Indexing</span>
            <span className="text-blue-900">•</span>
            <span>Agentic Discovery</span>
            <span className="text-blue-900">•</span>
            <span>Real-time Metrics</span>
          </div>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
        </footer>
      )}
    </div>
  );
}
