'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { getBuildHistory } from "@/lib/actions"; 
import { createClient } from "@supabase/supabase-js";
import { 
  CheckCircle2, XCircle, FileCode, Loader2, 
  Terminal, Hash, Video, ExternalLink, Activity,
  ChevronRight, ChevronDown, Cpu, Filter, ListFilter, Search
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FilterStatus = 'all' | 'passed' | 'failed' | 'running';

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]); 
  
  // 🔥 Filter States
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await getBuildHistory();
      setBuilds(data);
      if (data?.length > 0) {
        setSelectedBuild((current: any) => {
            const found = data.find((b: any) => b.id === (current?.id || data[0].id));
            return found || data[0];
        });
      }
    } catch (e) { console.error(e); } finally { if (isInitial) setLoading(false); }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(false); }, 2000);
    const channel = supabase.channel('db-changes').on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'test_results' 
    }, (payload) => {
        const updatedSpec = payload.new;
        const updateFn = (b: any) => b.id === updatedSpec.build_id 
            ? { ...b, results: b.results.map((r: any) => r.id === updatedSpec.id ? updatedSpec : r) } 
            : b;
        setBuilds(curr => curr.map(updateFn));
        setSelectedBuild((prev: any) => prev?.id === updatedSpec.build_id ? updateFn(prev) : prev);
    }).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  // 🔥 1. Calculate Aggregate Build Stats
  const buildStats = useMemo(() => {
    const stats = { total: 0, passed: 0, failed: 0, running: 0 };
    selectedBuild?.results?.forEach((spec: any) => {
      spec.tests.forEach((t: any) => {
        stats.total++;
        if (t.status === 'running') stats.running++;
        else if (t.status === 'passed' || t.status === 'expected') stats.passed++;
        else stats.failed++;
      });
    });
    return stats;
  }, [selectedBuild]);

  // 🔥 2. Extract Unique Projects for the dropdown
  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    selectedBuild?.results?.forEach((spec: any) => {
      spec.tests.forEach((t: any) => projects.add(t.project || "Default"));
    });
    return Array.from(projects).sort();
  }, [selectedBuild]);

  // 🔥 3. Filtered Logic: Flatten and Group Tests by Project
  const aggregatedProjects = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, spec: any) => {
      spec.tests.forEach((test: any) => {
        const projectName = test.project || "Default";
        
        // Match Status Filter
        const matchesStatus = filterStatus === 'all' || 
                             (filterStatus === 'passed' && (test.status === 'passed' || test.status === 'expected')) ||
                             (filterStatus === 'failed' && test.status === 'failed') ||
                             (filterStatus === 'running' && test.status === 'running');

        // Match Project Filter (Dropdown + Search)
        const matchesProjectDropdown = selectedProjectFilter === 'all' || selectedProjectFilter === projectName;
        const matchesProjectSearch = projectName.toLowerCase().includes(projectSearch.toLowerCase());

        if (matchesStatus && matchesProjectDropdown && matchesProjectSearch) {
          if (!acc[projectName]) acc[projectName] = [];
          acc[projectName].push({ ...test, specFile: spec.specFile, specId: spec.id });
        }
      });
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, selectedProjectFilter, projectSearch]);

  const sortedProjectNames = useMemo(() => Object.keys(aggregatedProjects || {}).sort(), [aggregatedProjects]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => { setSelectedBuild(b); setFilterStatus('all'); setSelectedProjectFilter('all'); }} className={`w-full text-left p-5 border-b border-white/5 transition-all ${selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5'}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black text-white">BUILD #{b.id}</span>
                <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase">{new Date(b.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-10">
        <header className="flex flex-col gap-8">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-black text-white tracking-tighter">Build #{selectedBuild?.id}</h1>
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedBuild?.environment}</span>
                    </div>
                </div>
                {buildStats.running > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl animate-pulse">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Live Execution</span>
                    </div>
                )}
            </div>

            {/* 🔥 FILTER BAR (Status + Project Search) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
                    <FilterButton active={filterStatus === 'all'} label="All" count={buildStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
                    <FilterButton active={filterStatus === 'passed'} label="Passed" count={buildStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
                    <FilterButton active={filterStatus === 'failed'} label="Failed" count={buildStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
                    <FilterButton active={filterStatus === 'running'} label="Running" count={buildStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
                </div>

                <div className="flex items-center gap-4 bg-[#111113] border border-white/5 p-2 rounded-2xl">
                    <div className="flex-1 flex items-center gap-3 px-4 bg-black/20 rounded-xl border border-white/5">
                        <Search className="w-4 h-4 text-zinc-600" />
                        <input 
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Filter by project name..."
                            className="bg-transparent border-none focus:ring-0 text-sm py-2 w-full text-zinc-300 placeholder:text-zinc-600"
                        />
                    </div>
                    <select 
                        value={selectedProjectFilter}
                        onChange={(e) => setSelectedProjectFilter(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 focus:ring-indigo-500 text-zinc-400"
                    >
                        <option value="all">All Projects</option>
                        {availableProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>
        </header>

        <div className="space-y-12 pb-20">
          {sortedProjectNames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-[#0c0c0e] rounded-3xl border border-dashed border-white/5">
                  <Hash className="w-12 h-12 text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">No matching results found</p>
                  <button onClick={() => { setFilterStatus('all'); setProjectSearch(''); setSelectedProjectFilter('all'); }} className="mt-4 text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:underline">Reset All Filters</button>
              </div>
          ) : sortedProjectNames.map((projectName) => {
            const tests = aggregatedProjects[projectName];
            const isProjectRunning = tests.some((t: any) => t.status === 'running');

            return (
                <div key={projectName} className={`bg-[#0c0c0e] border rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${isProjectRunning ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' : 'border-white/5'}`}>
                    <div className={`px-8 py-6 border-b flex items-center justify-between ${isProjectRunning ? 'bg-indigo-500/5' : 'bg-white/[0.02]'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${isProjectRunning ? 'bg-indigo-500/20 border-indigo-500/40 animate-pulse' : 'bg-white/5 border-white/10'}`}>
                                <Cpu className={`w-5 h-5 ${isProjectRunning ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1">Project</span>
                                <span className="text-lg font-black text-white tracking-tight">{projectName}</span>
                            </div>
                        </div>
                        <ProjectSummary tests={tests} filter={filterStatus} />
                    </div>

                    <div className="divide-y divide-white/5">
                        {tests.map((test: any, idx: number) => {
                            const testId = `${test.specId}-${projectName}-${test.title}`;
                            const isExpanded = expandedTests.includes(testId);

                            return (
                                <div key={testId} className={`transition-all ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                                    <button onClick={() => setExpandedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId])} className="w-full flex items-center justify-between px-8 py-5 text-left group">
                                        <div className="flex items-center gap-5">
                                            {test.status === 'running' ? (
                                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                            ) : (test.status === 'passed' || test.status === 'expected') ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500/80" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500/80" />
                                            )}
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-[10px] font-black text-indigo-500/60 bg-indigo-500/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">{test.case_code || 'N/A'}</span>
                                                    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[400px]">{test.specFile.split(/[\\/]/).pop()}</span>
                                                </div>
                                                <span className={`text-[15px] font-bold tracking-tight ${test.status === 'running' ? 'text-indigo-400 animate-pulse' : 'text-zinc-200'}`}>{test.title}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-mono text-zinc-600">{test.duration || '--'}</span>
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-700" /> : <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-8 pb-8 pt-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-zinc-500 px-1">
                                                    <Terminal className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Worker Console</span>
                                                </div>
                                                <LogTerminal logs={test.logs || []} status={test.status} />
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-zinc-500 px-1">
                                                    <Video className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Video recording</span>
                                                </div>
                                                {test.video_url ? (
                                                    <video controls className="w-full rounded-2xl border border-white/10 bg-black shadow-2xl aspect-video">
                                                        <source src={test.video_url} type="video/webm" />
                                                    </video>
                                                ) : (
                                                    <div className="aspect-video max-w-3xl bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                                                        <Video className="w-8 h-8 text-zinc-800" />
                                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{test.status === 'running' ? 'Recording live session...' : 'No recording available'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {test.status === 'failed' && test.error && (
                                                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl text-[11px] text-red-400/80 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">{test.error}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function FilterButton({ active, label, count, onClick, color }: any) {
    const colorClasses: any = {
        green: active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'hover:bg-green-500/5 text-zinc-500 border-transparent',
        red: active ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'hover:bg-red-500/5 text-zinc-500 border-transparent',
        indigo: active ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'hover:bg-indigo-500/5 text-zinc-500 border-transparent',
        zinc: active ? 'bg-zinc-100/10 text-zinc-100 border-white/20' : 'hover:bg-white/5 text-zinc-500 border-transparent'
    };

    return (
        <button onClick={onClick} className={`px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap ${colorClasses[color]}`}>
            {label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/10' : 'bg-black/20'}`}>{count}</span>
        </button>
    );
}

function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = status === 'running';
  useEffect(() => { if (isRunning && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs, isRunning]);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-700'}`} />
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{isRunning ? 'Realtime logs' : 'Log output'}</span>
        </div>
      </div>
      <div ref={scrollRef} className="p-5 font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed scroll-smooth select-text custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 mb-0.5 group">
            <span className="text-zinc-800 select-none w-5 text-right italic font-light">{i+1}</span>
            <span className={/error|failed/i.test(log) ? 'text-red-400' : /✅|passed|success/i.test(log) ? 'text-green-400' : 'text-zinc-400'}>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectSummary({ tests, filter }: { tests: any[], filter: string }) {
    const p = tests.filter(t => t.status === 'passed' || t.status === 'expected').length;
    const f = tests.filter(t => t.status === 'failed').length;
    const r = tests.filter(t => t.status === 'running').length;
    
    return (
        <div className="flex gap-3 items-center bg-black/20 px-4 py-1.5 rounded-2xl border border-white/5">
            {filter === 'all' || filter === 'running' ? r > 0 && <span className="text-[10px] font-black text-indigo-400 animate-pulse">{r} ACTIVE</span> : null}
            {filter === 'all' || filter === 'passed' ? <span className="text-[10px] font-black text-green-500">{p} PASSED</span> : null}
            {filter === 'all' || filter === 'failed' ? f > 0 && <span className="text-[10px] font-black text-red-500">{f} FAILED</span> : null}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'failed' ? 'bg-red-500/10 text-red-500' : status === 'passed' ? 'bg-green-500/10 text-green-500' : 'bg-indigo-500/10 text-indigo-500 animate-pulse';
  return <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest ${color}`}>{status.toUpperCase()}</span>;
}