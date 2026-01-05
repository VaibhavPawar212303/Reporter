'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { getBuildHistory } from "@/lib/actions"; 
import { createClient } from "@supabase/supabase-js";
import { 
  CheckCircle2, XCircle, FileCode, Loader2, 
  Terminal, Hash, Video, ExternalLink, Activity,
  ChevronRight, ChevronDown, Cpu
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]); 

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
        event: 'UPDATE', 
        schema: 'public', 
        table: 'test_results' 
    }, (payload) => {
        const updatedSpec = payload.new;
        setBuilds(curr => curr.map(b => b.id === updatedSpec.build_id ? 
            {...b, results: b.results.map((r:any) => r.id === updatedSpec.id ? updatedSpec : r)} : b
        ));
        setSelectedBuild((prev: any) => {
            if (prev?.id !== updatedSpec.build_id) return prev;
            return { ...prev, results: prev.results.map((r: any) => r.id === updatedSpec.id ? updatedSpec : r) };
        });
    }).subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const toggleTest = (testId: string) => {
    setExpandedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  // Grouping logic: Flatten all specs into Unified Project buckets
  const aggregatedProjects = selectedBuild?.results?.reduce((acc: any, spec: any) => {
    spec.tests.forEach((test: any) => {
      const projectName = test.project || "Default";
      if (!acc[projectName]) acc[projectName] = [];
      acc[projectName].push({ ...test, specFile: spec.specFile, specId: spec.id });
    });
    return acc;
  }, {});

  const sortedProjectNames = Object.keys(aggregatedProjects || {}).sort();

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => setSelectedBuild(b)} className={`w-full text-left p-5 border-b border-white/5 transition-all ${selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5'}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black text-white uppercase">Build #{b.id}</span>
                <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">{new Date(b.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-12">
        <header className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Build #{selectedBuild?.id}</h1>
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedBuild?.environment}</span>
                </div>
                <p className="text-zinc-500 text-sm font-medium">Consolidated Project View</p>
            </div>
            {selectedBuild?.results?.some((r:any) => r.tests.some((t:any) => t.status === 'running')) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl animate-pulse">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Live Sync</span>
                </div>
            )}
        </header>

        <div className="space-y-12">
          {sortedProjectNames.map((projectName) => {
            const tests = aggregatedProjects[projectName];
            const isProjectRunning = tests.some((t: any) => t.status === 'running');

            return (
                <div key={projectName} className={`bg-[#0c0c0e] border rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${isProjectRunning ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' : 'border-white/5'}`}>
                    <div className={`px-8 py-6 border-b flex items-center justify-between ${isProjectRunning ? 'bg-indigo-500/5' : 'bg-white/[0.02]'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isProjectRunning ? 'bg-indigo-500/20 border-indigo-500/40 animate-pulse' : 'bg-white/5 border-white/10'}`}>
                                <Cpu className={`w-6 h-6 ${isProjectRunning ? 'text-indigo-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1">Project Environment</span>
                                <span className="text-xl font-black text-white tracking-tight">{projectName}</span>
                            </div>
                        </div>
                        <ProjectSummary tests={tests} />
                    </div>

                    <div className="divide-y divide-white/5">
                        {tests.map((test: any, idx: number) => {
                            const testId = `${test.specId}-${projectName}-${test.title}`;
                            const isExpanded = expandedTests.includes(testId);

                            return (
                                <div key={testId} className={`transition-all ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                                    <button onClick={() => toggleTest(testId)} className="w-full flex items-center justify-between px-8 py-5 text-left group">
                                        <div className="flex items-center gap-5">
                                            {test.status === 'running' ? (
                                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                            ) : test.status === 'passed' ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500/80" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500/80" />
                                            )}
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-[10px] font-black text-indigo-500/60 bg-indigo-500/5 px-1.5 py-0.5 rounded leading-none">{test.case_code || 'TC-N/A'}</span>
                                                    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[400px]">
                                                        {test.specFile.split(/[\\/]/).pop()}
                                                    </span>
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
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Video Evidence</span>
                                                </div>
                                                {test.video_url ? (
                                                    <video controls className="w-full rounded-2xl border border-white/10 bg-black shadow-2xl aspect-video">
                                                        <source src={test.video_url} type="video/webm" />
                                                    </video>
                                                ) : (
                                                    <div className="aspect-video max-w-3xl bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                                                        <Video className="w-8 h-8 text-zinc-800" />
                                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{test.status === 'running' ? 'Recording in progress...' : 'No video'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {test.status === 'failed' && test.error && (
                                                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl text-[11px] text-red-400/80 font-mono whitespace-pre-wrap leading-relaxed">{test.error}</div>
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

// 🔥 FIX: Added conditional scrolling based on status
function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRunning = status === 'running';

  useEffect(() => {
    // Only move the scrollbar if the test is currently RUNNING.
    // If finished, we preserve the user's manual scroll position.
    if (isRunning && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isRunning]);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-700'}`} />
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                {isRunning ? 'Streaming logs...' : 'Final execution log'}
            </span>
        </div>
        <span className="text-[8px] font-mono text-zinc-600">{logs.length} lines</span>
      </div>
      <div ref={scrollRef} className="p-5 font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed scroll-smooth custom-scrollbar select-text">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 mb-0.5 group">
            <span className="text-zinc-800 select-none w-5 text-right italic">{i+1}</span>
            <span className={/error|failed/i.test(log) ? 'text-red-400' : /✅|passed|success/i.test(log) ? 'text-green-400' : 'text-zinc-400'}>
                {log}
            </span>
          </div>
        ))}
        {isRunning && (
            <div className="flex gap-4 items-center mt-1">
                <span className="text-zinc-800 select-none w-5 text-right italic">{logs.length + 1}</span>
                <div className="w-1.5 h-4 bg-indigo-500 animate-pulse" />
            </div>
        )}
      </div>
    </div>
  );
}

function ProjectSummary({ tests }: { tests: any[] }) {
    const p = tests.filter(t => t.status === 'passed').length;
    const f = tests.filter(t => t.status === 'failed').length;
    const r = tests.filter(t => t.status === 'running').length;
    return (
        <div className="flex gap-3 items-center bg-black/20 px-4 py-1.5 rounded-2xl border border-white/5">
            {r > 0 && <span className="text-[10px] font-black text-indigo-400 animate-pulse">{r} ACTIVE</span>}
            <span className="text-[10px] font-black text-green-500">{p} PASSED</span>
            {f > 0 && <span className="text-[10px] font-black text-red-500">{f} FAILED</span>}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'failed' ? 'bg-red-500/10 text-red-500' : status === 'passed' ? 'bg-green-500/10 text-green-500' : 'bg-indigo-500/10 text-indigo-500 animate-pulse';
  return <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest ${color}`}>{status.toUpperCase()}</span>;
}