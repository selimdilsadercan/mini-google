"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
  const [isCreating, setIsCreating] = useState(false);

  // Form stats
  const [origin, setOrigin] = useState("https://www.google.com");
  const [depth, setDepth] = useState(1);
  const [hitRate, setHitRate] = useState(5);
  const [onlyExternalDomains, setOnlyExternalDomains] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Poll jobs & logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobsRes = await fetch("/api/crawler/list");
        const jobsData = await jobsRes.json();
        setJobs(jobsData);

        const activeId =
          selectedJobId || (jobsData.length > 0 ? jobsData[0].id : null);
        if (!selectedJobId && activeId) setSelectedJobId(activeId);

        if (activeId) {
          const statusRes = await fetch(`/api/status?id=${activeId}`);
          setStatus(await statusRes.json());

          const logsRes = await fetch(`/api/crawler/logs?id=${activeId}`);
          setLogs(await logsRes.json());
        }

        const dbRes = await fetch("/api/db-preview");
        setDbPreview(await dbRes.json());
      } catch (err) {
        console.error("Update failed", err);
      }
    };

    fetchData();
    const inv = setInterval(fetchData, 2000);
    return () => clearInterval(inv);
  }, [selectedJobId]);

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
    if (!confirm("Are you sure you want to delete this crawler task?")) return;
    await fetch("/api/crawler/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedJobId === id) setSelectedJobId(null);
  };

  const selectedJob = Array.isArray(jobs) ? jobs.find((j) => j.id === selectedJobId) : null;

  return (
    <div className="flex h-screen bg-black text-slate-100 font-sans overflow-hidden">
      {/* Sidebar: All Jobs */}
      <aside className="w-80 border-r border-slate-900 bg-slate-950 flex flex-col">
        <div className="p-6 border-b border-slate-900">
          <h2 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Robot Army
          </h2>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">
            Command & Control
          </p>

          <button
            onClick={() => {
              setIsCreating(true);
              setSelectedJobId(null);
            }}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-all shadow-xl shadow-indigo-600/20"
          >
            <span className="text-xl">+</span>
            <span>New Crawler</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Array.isArray(jobs) ? (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => {
                  setSelectedJobId(job.id);
                  setIsCreating(false);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all border group cursor-pointer ${selectedJobId === job.id ? "bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-tighter">
                    ID: {job.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${job.status === "running" ? "bg-emerald-500/20 text-emerald-400 animate-pulse" : "bg-slate-800 text-slate-500"}`}
                    >
                      {job.status}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {job.status === "running" && (
                        <button
                          onClick={(e) => handleStop(job.id, e)}
                          className="p-1 hover:bg-amber-500/20 text-amber-500 rounded transition-colors"
                        >
                          ⏹
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(job.id, e)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
                <h3 className="text-xs font-bold truncate text-slate-200 mb-2">
                  {job.origin}
                </h3>
                <div className="mt-2 flex gap-3 text-[10px] font-bold text-slate-500">
                  <span>Depth: {job.max_depth}</span>
                  <span>Rate: {job.hit_rate}/s</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-800 text-xs text-center py-10 italic">
              Loading intelligence units...
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-900/20 border-t border-slate-900 text-center">
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 font-bold underline transition-all">
             ← Back to Search Engine
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-black">
        {isCreating ? (
          <section className="p-12 max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
            <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-3xl shadow-2xl">
              <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
                <span className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse"></span>
                Deploy Intelligence Unit
              </h3>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target URL</label>
                  <input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 text-lg"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Depth Level</label>
                    <input
                      type="number"
                      value={depth}
                      onChange={(e) => setDepth(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-indigo-400 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hit Rate (req/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={hitRate}
                      onChange={(e) => setHitRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer" onClick={() => setOnlyExternalDomains(!onlyExternalDomains)}>
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${onlyExternalDomains ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                    {onlyExternalDomains && <span className="text-white font-bold text-sm">✓</span>}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-300">Target External Domains Only</span>
                    <p className="text-[10px] text-slate-500 font-medium">Prevents getting stuck on a single site (News/Blogs mode)</p>
                  </div>
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-indigo-600/40 text-xl mt-10">
                  Start Crawling Task
                </button>
              </form>
            </div>
          </section>
        ) : (
          <>
            <section className="p-8 border-b border-slate-900 bg-slate-950 flex justify-between items-center">
              {selectedJob ? (
                <div className="w-full flex justify-between items-end">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Active Robot Identity</span>
                      <span className="font-mono text-indigo-400 font-bold text-xs bg-indigo-500/10 px-2 py-0.5 rounded">{selectedJob.id}</span>
                    </div>
                    <h4 className="text-3xl font-black truncate max-w-2xl">{selectedJob.origin}</h4>
                  </div>
                  <div className="flex gap-12 text-right">
                    <div>
                      <p className="text-[10px] text-slate-600 font-bold uppercase mb-1">Status</p>
                      <p className={`text-2xl font-black ${selectedJob.status === "running" ? "text-emerald-400" : "text-slate-400"}`}>
                        {selectedJob.status.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 font-bold uppercase mb-1">Depth Plan</p>
                      <p className="text-2xl font-black text-blue-400">Level {selectedJob.max_depth}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-800 font-black italic text-2xl py-4">Select intelligence unit...</div>
              )}
            </section>
            <div className="flex-1 flex overflow-hidden">
              <section className="flex-1 bg-black p-6 font-mono text-xs overflow-y-auto border-r border-slate-900">
                <div className="flex justify-between items-center mb-4 text-slate-700 border-b border-slate-900 pb-2">
                  <span className="font-black tracking-widest uppercase">System Interaction Logs</span>
                  <span className="animate-pulse">● LIVE</span>
                </div>
                <div className="space-y-1.5 opacity-80">
                  {Array.isArray(logs) && logs.length > 0 ? (
                    logs.map((l) => (
                      <div key={l.id} className="flex gap-3">
                        <span className="text-slate-800">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                        <span className={l.level === "error" ? "text-red-500" : l.level === "warn" ? "text-amber-500" : "text-emerald-400"}>
                          {l.level.toUpperCase()}
                        </span>
                        <span className="text-slate-400">{l.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-900 py-10 italic">No logs received yet...</div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </section>
              <section className="w-1/3 bg-slate-950 flex flex-col">
                <div className="p-6 border-b border-slate-900 h-[60px] flex items-center">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Global Database Preview</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-slate-900 text-slate-700 uppercase font-black sticky top-0">
                      <tr><th className="px-4 py-3">Site</th><th className="px-4 py-3">Hop</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {Array.isArray(dbPreview) && dbPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono truncate max-w-[150px]">{row.url}</td>
                          <td className="px-4 py-3 text-indigo-500 font-black italic">#{row.depth}</td>
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
    </div>
  );
}
