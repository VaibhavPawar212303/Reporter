'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { getBuildHistory } from "@/lib/actions"; 
import { createClient } from "@supabase/supabase-js";
import { 
  CheckCircle2, XCircle, FileCode, Folder, Loader2, 
  Terminal, Hash, Video, ExternalLink, Activity,
  ChevronRight, ChevronDown, Monitor, Layout, Cpu
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
        setSelectedBuild((prev: any) => prev?.id === updatedSpec.build_id ? 
            {...prev, results: prev.results.map((r:any) => r.id === updatedSpec.id ? updatedSpec : r)} : prev
        );
    }).subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const toggleTest = (testId: string) => {
    setExpandedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">Build History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => setSelectedBuild(b)} className={`w-full text-left p-5 border-b border-white/5 transition-all ${selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5'}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black text-white">BUILD #{b.id}</span>
                <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight">{new Date(b.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-10 space-y-12">
        <header className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Build #{selectedBuild?.id}</h1>
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedBuild?.environment}</span>
                </div>
                <p className="text-zinc-500 text-sm font-medium">Cross-browser execution overview</p>
            </div>
            
            {/* Live Indicator */}
            {selectedBuild?.results?.some((r:any) => r.tests.some((t:any) => t.status === 'running')) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl animate-pulse">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Live Syncing</span>
                </div>
            )}
        </header>

        <div className="space-y-16">
          {selectedBuild?.results?.map((spec: any) => (
            <SpecSection 
                key={spec.id} 
                spec={spec} 
                expandedTests={expandedTests} 
                onToggle={toggleTest} 
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function SpecSection({ spec, expandedTests, onToggle }: any) {
  // Group tests using the explicit "project" field from the JSONB array
  const groupedByProject = spec.tests.reduce((acc: any, test: any) => {
    const projectName = test.project || "Default";
    if (!acc[projectName]) acc[projectName] = [];
    acc[projectName].push(test);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2 border-l-2 border-indigo-500/30 pl-4">
        <FileCode className="w-5 h-5 text-indigo-500/50" />
        <h2 className="text-md font-mono font-bold text-zinc-100">{spec.specFile}</h2>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {Object.entries(groupedByProject).map(([projectName, tests]: [string, any]) => (
            <div key={projectName} className="bg-[#0c0c0e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {/* Project Header */}
                <div className="bg-white/[0.03] px-8 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Cpu className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 leading-none block mb-1">Project Environment</span>
                            <span className="text-lg font-black text-white tracking-tight">{projectName}</span>
                        </div>
                    </div>
                    <ProjectSummary tests={tests} />
                </div>

                {/* Tests List */}
                <div className="divide-y divide-white/5">
                    {tests.map((test: any, idx: number) => {
                        // Unique ID for accordion: SpecID + ProjectName + TestTitle
                        const testId = `${spec.id}-${projectName}-${test.title}`;
                        const isExpanded = expandedTests.includes(testId);

                        return (
                            <div key={idx} className={`transition-all ${isExpanded ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'}`}>
                                <button 
                                    onClick={() => onToggle(testId)}
                                    className="w-full flex items-center justify-between px-8 py-5 text-left group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            {test.status === 'running' ? (
                                                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                            ) : test.status === 'passed' ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500/80" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-500/80" />
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-indigo-500/60 bg-indigo-500/5 px-1.5 py-0.5 rounded leading-none">
                                                    {test.case_code || 'TC-N/A'}
                                                </span>
                                                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">
                                                    {test.duration || '0.00s'}
                                                </span>
                                            </div>
                                            <span className={`text-[15px] font-bold tracking-tight leading-snug ${test.status === 'running' ? 'text-indigo-400 animate-pulse' : 'text-zinc-200'}`}>
                                                {test.title}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-700" /> : <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />}
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-8 pb-8 pt-2 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                        
                                        {/* Console Logs */}
                                        {(test.logs?.length > 0 || test.status === 'running') && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-zinc-500 px-1">
                                                    <Terminal className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Realtime Logs</span>
                                                </div>
                                                <LogTerminal logs={test.logs || []} status={test.status} />
                                            </div>
                                        )}

                                        {/* Video Recording */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-zinc-500 px-1">
                                                <Video className="w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Recording</span>
                                            </div>
                                            {test.video_url ? (
                                                <div className="relative group/vid max-w-3xl">
                                                    <video controls className="w-full rounded-2xl border border-white/10 bg-black shadow-2xl aspect-video">
                                                        <source src={test.video_url} type="video/webm" />
                                                    </video>
                                                    <a href={test.video_url} target="_blank" className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black rounded-lg text-white opacity-0 group-hover/vid:opacity-100 transition-opacity">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="aspect-video max-w-3xl bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                                                    <Video className="w-8 h-8 text-zinc-800" />
                                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                                                        {test.status === 'running' ? 'Recording in progress...' : 'No recording available'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Error Trace */}
                                        {test.status === 'failed' && test.error && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-red-500/50 px-1">
                                                    <XCircle className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Failure Trace</span>
                                                </div>
                                                <div className="p-5 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
                                                    <code className="text-[11px] text-red-400/80 font-mono whitespace-pre-wrap block leading-relaxed">
                                                        {test.error}
                                                    </code>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [logs]);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden shadow-inner">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/20" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
            <div className="w-2 h-2 rounded-full bg-green-500/20" />
        </div>
        <span className="text-[9px] font-mono text-zinc-600">sh — 80x24</span>
      </div>
      <div ref={scrollRef} className="p-5 font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed scroll-smooth custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 mb-1 group">
            <span className="text-zinc-800 select-none w-4 text-right italic">{i+1}</span>
            <span className={/error|failed/i.test(log) ? 'text-red-400' : /✅|success|passed/i.test(log) ? 'text-green-400' : 'text-zinc-400'}>
                {log}
            </span>
          </div>
        ))}
        {status === 'running' && (
            <div className="flex gap-4 items-center mt-1">
                <span className="text-zinc-800 select-none w-4 text-right italic">{logs.length + 1}</span>
                <div className="w-2 h-4 bg-indigo-500 animate-pulse" />
            </div>
        )}
      </div>
    </div>
  );
}

function ProjectSummary({ tests }: { tests: any[] }) {
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const running = tests.filter(t => t.status === 'running').length;

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Results</span>
                <div className="flex gap-3 mt-1">
                    {running > 0 && <span className="text-[10px] font-black text-indigo-400 animate-pulse">{running} RUNNING</span>}
                    <span className="text-[10px] font-black text-green-500">{passed} PASSED</span>
                    <span className="text-[10px] font-black text-red-500">{failed} FAILED</span>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
  const colors = status === 'failed' ? 'text-red-500' : status === 'passed' ? 'text-green-500' : 'text-yellow-500';
  return <span className={`text-[10px] font-black uppercase tracking-widest ${colors}`}>{status}</span>;
}