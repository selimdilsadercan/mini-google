"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

interface CrawlerJob {
  id: string;
  origin: string;
  max_depth: number;
  status: string;
  created_at: string;
  hit_rate: number;
}

interface LogEntry {
  id: number;
  message: string;
  level: string;
  timestamp: string;
}

interface DBRow {
  url: string;
  origin: string;
  depth: number;
  created_at: string;
}

export default function AdminPage() {
  const [jobs, setJobs] = useState<CrawlerJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dbPreview, setDbPreview] = useState<DBRow[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [statsHistory, setStatsHistory] = useState<{ visited: number[], queue: number[] }>({ visited: [], queue: [] });
  const [analytics, setAnalytics] = useState<{ domainDistribution: any[], indexingHistory: any[] }>({ domainDistribution: [], indexingHistory: [] });
  const [highContrast, setHighContrast] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form stats
  const [origin, setOrigin] = useState("https://www.wikipedia.org");
  const [depth, setDepth] = useState(1);
  const [hitRate, setHitRate] = useState(5);
  const [onlyExternalDomains, setOnlyExternalDomains] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobsRes = await fetch("/api/crawler/list");
        const jobsData = await jobsRes.json();
        setJobs(jobsData);

        const activeId = selectedJobId || (jobsData.length > 0 ? jobsData[0].id : null);
        if (!selectedJobId && activeId) setSelectedJobId(activeId);

        if (activeId) {
          const statusRes = await fetch(`/api/status?id=${activeId}`);
          setStatus(await statusRes.json());

          const logsRes = await fetch(`/api/crawler/logs?id=${activeId}`);
          setLogs(await logsRes.json());
        }

        const dbRes = await fetch("/api/db-preview");
        setDbPreview(await dbRes.json());

        const analyticsRes = await fetch("/api/analytics");
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      } catch (err) {
        console.error("Update failed", err);
      }
    };

    fetchData();
    const inv = setInterval(fetchData, 2000);
    return () => clearInterval(inv);
  }, [selectedJobId]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Update history for sparklines
  useEffect(() => {
    if (status) {
      setStatsHistory(prev => ({
        visited: [...prev.visited, status.visitedCount || 0].slice(-20),
        queue: [...prev.queue, status.queueDepth || 0].slice(-20)
      }));
    }
  }, [status]);

  // Sparkline Component
  const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length < 2) return <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * height}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-16 h-6 overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
        />
      </svg>
    );
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/crawler/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, depth, hitRate, onlyExternalDomains }),
    });
    const data = await res.json();
    setSelectedJobId(data.id);
    setIsCreating(false);
  };

  const handleStop = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/crawler/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to decommission this intelligence unit?")) return;
    await fetch("/api/crawler/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedJobId === id) setSelectedJobId(null);
  };

  const selectedJob = Array.isArray(jobs) ? jobs.find((j) => j.id === selectedJobId) : null;

  return (
    <div className="flex h-screen bg-mesh text-slate-100 selection:bg-blue-500/30 overflow-hidden">
      
      {/* Task Fleet Sidebar */}
      <aside className="w-85 glass border-r border-white/5 flex flex-col z-20">
        <div className="p-8 border-b border-white/5">
          <Link href="/" className="group flex items-center gap-3 mb-8">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center border-blue-500/30 group-hover:border-blue-500 transition-all shadow-lg shadow-blue-500/20">
              <span className="text-blue-400 font-black">G</span>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tighter leading-none">MINI-GOOGLE</h2>
              <p className="text-[9px] text-slate-500 font-black tracking-[0.2em] mt-1 uppercase">Control Center</p>
            </div>
          </Link>

          <button
            onClick={() => { setIsCreating(true); setSelectedJobId(null); }}
            className="w-full relative overflow-hidden group px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 active:scale-95"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-xl font-bold">+</span>
              <span className="font-black text-xs tracking-widest uppercase">New Deployment</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <div className="px-4 py-2 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Fleet</span>
            <span className="text-[10px] font-mono text-blue-500 font-bold">{jobs.length} UNITS</span>
          </div>
          {Array.isArray(jobs) && jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => { setSelectedJobId(job.id); setIsCreating(false); }}
                className={`group relative p-5 rounded-2xl transition-all border cursor-pointer ${selectedJobId === job.id ? "glass border-blue-500 shadow-xl shadow-blue-500/10 bg-blue-500/[0.03]" : "glass-card border-white/5 hover:border-white/10"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${job.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-slate-700"}`}></div>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">{job.id.split('-')[0]}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {job.status === "running" && (
                      <button onClick={(e) => handleStop(job.id, e)} className="p-1 px-2 hover:bg-amber-500/20 text-amber-500 rounded text-[10px] transition-colors">STOP</button>
                    )}
                    <button onClick={(e) => handleDelete(job.id, e)} className="p-1 px-2 hover:bg-red-500/20 text-red-400 rounded text-[10px] transition-colors">DELETE</button>
                  </div>
                </div>
                <h3 className="text-sm font-bold truncate text-white mb-2 leading-tight">{job.origin}</h3>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Rate</span>
                        <span className="text-[10px] font-mono text-blue-400">{job.hit_rate} req/s</span>
                    </div>
                    <div className="h-6 w-[1px] bg-white/5"></div>
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Depth</span>
                        <span className="text-[10px] font-mono text-white">L0{job.max_depth}</span>
                    </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
                <p className="text-xs text-slate-700 italic font-medium tracking-tight">Fleet inactive...</p>
            </div>
          )}
        </div>
      </aside>

      {/* Primary Intelligence Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        {isCreating ? (
          <section className="p-12 max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center">
            <div className="glass-card p-12 border-white/10 shadow-[0_0_50px_rgba(37,99,235,0.1)] relative overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
              <h3 className="text-4xl font-black mb-2 tracking-tighter">Deploy Agent</h3>
              <p className="text-slate-500 text-sm mb-12 font-medium">Configure and launch a new web discovery unit.</p>
              
              <form onSubmit={handleCreate} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Universal Target Identifier (URL)</label>
                  <input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full glass border-white/10 rounded-2xl px-8 py-5 focus:outline-none focus:border-blue-500/50 text-xl font-bold placeholder:text-slate-800 transition-all"
                    placeholder="https://intelligence-target.com"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Recursion Depth</label>
                    <div className="relative">
                        <input
                        type="number" value={depth}
                        onChange={(e) => setDepth(Number(e.target.value))}
                        className="w-full glass border-white/10 rounded-2xl px-8 py-5 text-blue-400 font-black text-2xl focus:border-blue-500/50 outline-none transition-all"
                        />
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">LEVELS</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Impact Velocity (Req/s)</label>
                    <div className="relative">
                        <input
                        type="number" step="0.1" value={hitRate}
                        onChange={(e) => setHitRate(Number(e.target.value))}
                        className="w-full glass border-white/10 rounded-2xl px-8 py-5 text-emerald-400 font-black text-2xl focus:border-emerald-500/50 outline-none transition-all"
                        />
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">FREQ</span>
                    </div>
                  </div>
                </div>

                <div 
                    onClick={() => setOnlyExternalDomains(!onlyExternalDomains)}
                    className={`flex items-center gap-6 p-6 rounded-2xl border transition-all cursor-pointer ${onlyExternalDomains ? 'glass border-blue-500/50 bg-blue-500/5' : 'glass border-white/5'}`}
                >
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${onlyExternalDomains ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30' : 'border-slate-800 bg-white/5'}`}>
                    {onlyExternalDomains && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white uppercase tracking-tight">Aggressive External Mapping</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Prioritize out-bound link discovery across domains</p>
                  </div>
                </div>

                <button type="submit" className="w-full relative py-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black tracking-[0.3em] uppercase transition-all shadow-2xl shadow-blue-600/40 text-sm overflow-hidden group">
                  <span className="relative z-10 flex items-center justify-center gap-4">
                    INITIALIZE DEPLOYMENT
                    <svg className="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </form>
            </div>
          </section>
        ) : (
          <>
            {/* Control Header */}
            <header className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col gap-8 backdrop-blur-md sticky top-0 z-10">
              <div className="flex justify-between items-end w-full">
                {selectedJob ? (
                  <div className="w-full flex justify-between items-end gap-12">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-0.5 glass rounded-md border-blue-500/20">
                          <span className="text-[10px] font-mono text-blue-400 font-black">IDENTITY: {selectedJob.id.toUpperCase()}</span>
                        </div>
                        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Active Scan</span>
                      </div>
                      <h4 className="text-4xl font-black truncate tracking-tighter text-white drop-shadow-sm">{selectedJob.origin}</h4>
                    </div>
                    <div className="flex gap-12 shrink-0 items-end">
                      <button 
                        onClick={() => setHighContrast(!highContrast)}
                        className={`px-4 py-2 rounded-xl border transition-all text-[9px] font-black tracking-widest uppercase mb-1 ${highContrast ? 'bg-yellow-500 border-yellow-400 text-black' : 'glass border-white/10 text-slate-500 hover:text-white'}`}
                      >
                        {highContrast ? 'Standard' : 'Contrast'}
                      </button>
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-1">Status</p>
                        <p className={`text-2xl font-black tracking-tighter ${selectedJob.status === "running" ? "text-emerald-400 text-glow" : "text-slate-500"}`}>
                          {selectedJob.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center w-full">
                      <div className="w-12 h-[1px] bg-slate-900 mb-4"></div>
                      <p className="text-slate-800 font-black tracking-[0.4em] uppercase text-sm">Waiting for Identity Selection</p>
                      <div className="w-12 h-[1px] bg-slate-900 mt-4"></div>
                  </div>
                )}
              </div>
              
              {selectedJob && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-card p-4 flex justify-between items-center group">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Visited Nodes</span>
                      <span className="text-2xl font-black text-white">{status?.visitedCount || 0}</span>
                    </div>
                    <Sparkline data={statsHistory.visited} color="#3b82f6" />
                  </div>
                  <div className="glass-card p-4 flex justify-between items-center group">
                    <div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Queue Depth</span>
                      <span className="text-2xl font-black text-white">{status?.queueDepth || 0}</span>
                    </div>
                    <Sparkline data={statsHistory.queue} color="#f59e0b" />
                  </div>
                </div>
              )}
            </header>

            {/* Intelligence Analytics Section */}
            <section className="p-8 pb-0">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Analytics Stream</h3>
                </div>
                <div className="flex gap-6">
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Global Index</span>
                      <span className="text-xs font-mono text-blue-400 font-bold">{analytics.indexingHistory?.slice(-1)[0]?.total_pages || 0} PG</span>
                   </div>
                   <div className="w-[1px] h-6 bg-white/5"></div>
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Active Threads</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">{jobs.filter(j => j.status === 'running').length} Units</span>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="glass-card p-6 h-64 flex flex-col group hover:border-blue-500/20 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Growth Trajectory</h3>
                    <span className="text-[9px] font-mono text-blue-500 font-bold">LATEST_SYNC: {new Date().toLocaleTimeString()}</span>
                  </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.indexingHistory}>
                      <defs>
                        <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ color: '#60a5fa' }}
                      />
                      <Area type="monotone" dataKey="total_pages" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPages)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 h-64 flex flex-col">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Domain Dominance</h3>
                <div className="flex-1 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.domainDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="domain"
                      >
                        {analytics.domainDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="hidden sm:flex flex-col gap-2 ml-4">
                    {analytics.domainDistribution?.slice(0, 4).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][i % 5] }}></div>
                        <span className="text-[9px] font-black text-slate-400 truncate w-20 uppercase tracking-tighter">{d.domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
                </div>
              </section>

            <div className="flex-1 flex overflow-hidden">
              {/* Log Terminal */}
              <section className="flex-1 bg-black/40 p-0 flex flex-col min-w-0 border-r border-white/5 relative">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="font-black text-[10px] tracking-[0.2em] uppercase text-slate-500">System Log Interface</span>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-mono text-slate-700">
                    <span>BAUD: 115200</span>
                    <span>PROTO: AGENT-V1</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-2 leading-relaxed custom-scrollbar">
                  {Array.isArray(logs) && logs.length > 0 ? (
                    logs.map((l) => (
                      <div key={l.id} className="group flex gap-4 p-1 hover:bg-white/[0.02] rounded transition-colors duration-100">
                        <span className="text-slate-700 shrink-0">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-black shrink-0 w-12 ${l.level === "error" ? "text-red-500" : l.level === "warn" ? "text-amber-500" : "text-blue-500"}`}>
                          {l.level.toUpperCase()}
                        </span>
                        <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{l.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <svg className="w-16 h-16 text-slate-800 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting System Data Feed...</p>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
                {/* Visual Glitch Decor */}
                <div className="absolute bottom-4 right-4 text-[10px] font-black text-blue-900/50 select-none animate-pulse">0x8FB4-INTELLIGENCE</div>
              </section>

              {/* Data Preview Panel */}
              <section className="w-96 glass-card border-none rounded-none flex flex-col shrink-0">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Index Stream</h3>
                  <div className="px-2 py-0.5 bg-blue-500/10 rounded text-[9px] font-black text-blue-400">LIVE</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.01] sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Universal ID</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest w-16 text-center">HOP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {Array.isArray(dbPreview) && dbPreview.map((row, i) => (
                        <tr key={i} className="group hover:bg-white/[0.03] transition-colors">
                          <td className="px-6 py-3 min-w-0">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-slate-300 text-[11px] font-mono truncate max-w-[200px] group-hover:text-blue-400 transition-colors">{new URL(row.url).hostname}</span>
                                <span className="text-[9px] text-slate-600 truncate max-w-[200px]">{row.url}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="text-[10px] font-black text-blue-600 group-hover:text-blue-400 transition-colors">#{row.depth}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Dynamic Scan Line Effect */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
    </div>
  );
}
