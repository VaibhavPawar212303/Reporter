'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { getBuildHistory } from "@/lib/actions"; 
import { createClient } from "@supabase/supabase-js";
import { 
  CheckCircle2, XCircle, FileCode, Folder, Loader2, 
  Terminal, Hash, Video, ExternalLink, Activity
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Use useCallback to memoize the data fetching logic
  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await getBuildHistory();
      
      setBuilds(data);

      if (data?.length > 0) {
        // We use a functional update to ensure we have the latest state 
        // and maintain the user's selection during the background refresh
        setSelectedBuild((currentSelected: any) => {
          if (currentSelected) {
            const updated = data.find((b: any) => b.id === currentSelected.id);
            return updated || data[0];
          }
          return data[0];
        });
      }
    } catch (error) {
      console.error("Failed to load builds:", error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Effect 1: Handle the 2-second background refresh (Polling)
  useEffect(() => {
    // Initial fetch with loading spinner
    loadData(true);

    // Set up interval for background updates every 2 seconds
    const intervalId = setInterval(() => {
      // Only fetch if the tab is actually visible to the user
      if (!document.hidden) {
        loadData(false); // Silent refresh (no spinner)
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [loadData]);

  // Effect 2: Supabase Realtime (For granular log updates between polls)
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'test_results' },
        (payload) => {
          setBuilds((currentBuilds) => 
            currentBuilds.map((build) => {
              if (build.id === payload.new.build_id) {
                const updatedResults = build.results.map((spec: any) => 
                  spec.id === payload.new.id ? payload.new : spec
                );
                const updatedBuild = { ...build, results: updatedResults };
                
                // Keep the detail view in sync with realtime logs
                setSelectedBuild((prev: any) => 
                  prev?.id === build.id ? updatedBuild : prev
                );
                
                return updatedBuild;
              }
              return build;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = selectedBuild?.results?.reduce((acc: any, spec: any) => {
    spec.tests.forEach((t: any) => {
      acc.total++;
      if (t.status === 'passed' || t.status === 'expected') acc.passed++;
      if (t.status === 'running') acc.running++;
    });
    return acc;
  }, { total: 0, passed: 0, running: 0 }) || { total: 0, passed: 0, running: 0 };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#09090b] h-screen">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300">
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-5 border-b border-white/5 bg-black/20 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Execution Builds
        </div>
        {builds.map((build) => (
          <button
            key={build.id}
            onClick={() => setSelectedBuild(build)}
            className={`w-full text-left p-5 border-b border-white/5 transition-all ${
              selectedBuild?.id === build.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-white uppercase tracking-tight">Build #{build.id}</span>
              <StatusBadge status={build.status} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-500 font-mono">{new Date(build.createdAt).toLocaleDateString()}</p>
              <span className="text-[9px] text-zinc-600 font-bold uppercase">{build.environment}</span>
            </div>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 bg-[#09090b]">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Hash className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">Build #{selectedBuild?.id}</h1>
                {stats.running > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-md animate-pulse">
                    <Activity className="w-3 h-3" /> LIVE
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-sm font-medium">Platform: Playwright / Cypress Automation</p>
            </div>
          </div>
          <div className="flex gap-3">
            <StatCard label="Tests" value={stats.total} color="text-indigo-400" />
            <StatCard label="Passed" value={stats.passed} color="text-green-400" />
            <StatCard label="Running" value={stats.running} color="text-yellow-500" />
            <StatCard label="Failed" value={stats.total - stats.passed - stats.running} color="text-red-400" />
          </div>
        </header>

        <div className="space-y-10">
          {selectedBuild?.results?.map((spec: any) => (
            <div key={spec.id} className="group">
              <div className="flex items-center gap-3 mb-4 px-2">
                <FileCode className="w-5 h-5 text-indigo-500/50" />
                <h2 className="text-md font-bold text-zinc-100 font-mono">{spec.specFile}</h2>
                <div className="h-px flex-1 bg-white/5 mx-4" />
              </div>
              <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 shadow-2xl">
                <RenderSuites tests={spec.tests} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function RenderSuites({ tests }: { tests: any[] }) {
  const groupedBySuite = tests.reduce((acc: any, test: any) => {
    const suitePath = test.suites?.length > 0 ? test.suites.join("  ›  ") : "Root";
    if (!acc[suitePath]) acc[suitePath] = [];
    acc[suitePath].push(test);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      {Object.entries(groupedBySuite).map(([suitePath, suiteTests]: [string, any]) => (
        <div key={suitePath}>
          <div className="flex items-center gap-3 mb-6">
            <Folder className="w-4 h-4 text-zinc-600" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{suitePath}</h3>
          </div>
          <div className="ml-2 pl-8 border-l border-white/5 space-y-8">
            {suiteTests.map((test: any, idx: number) => (
              <TestRow key={idx} test={test} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TestRow({ test }: { test: any }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all">
        <div className="flex items-center gap-4">
          {test.status === 'running' ? (
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          ) : (test.status === 'passed' || test.status === 'expected') ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
              {test.case_code || 'N/A'}
            </span>
            <span className={`text-sm font-semibold transition-colors ${test.status === 'running' ? 'text-indigo-400 animate-pulse' : 'text-zinc-300 group-hover:text-white'}`}>
              {test.title}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">{test.duration || '--'}</span>
      </div>

      {(test.logs && test.logs.length > 0 || test.status === 'running') && (
        <LogTerminal logs={test.logs || []} status={test.status} />
      )}

      {test.video_url && (
        <div className="mt-4 ml-12 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[9px] font-black uppercase tracking-widest text-indigo-400">
              <Video className="w-3 h-3" /> Recording
            </span>
            <a 
              href={test.video_url} 
              target="_blank" 
              className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <video controls preload="none" className="w-full max-w-xl rounded-xl border border-white/10 shadow-2xl bg-black aspect-video">
            <source src={test.video_url} type="video/webm" />
          </video>
        </div>
      )}

      {test.status === 'failed' && (
        <div className="mt-3 ml-12 p-4 bg-red-500/[0.03] border border-red-500/10 rounded-xl">
          <div className="flex gap-3">
            <Terminal className="w-4 h-4 text-red-500 shrink-0 mt-1" />
            <code className="text-[11px] text-red-400/90 leading-relaxed font-mono whitespace-pre-wrap block">
              {test.error}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function LogTerminal({ logs, status }: { logs: string[], status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="mt-4 ml-12 overflow-hidden rounded-lg border border-white/5 bg-[#050505] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-zinc-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Worker Output</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="max-h-60 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed scroll-smooth custom-scrollbar"
      >
        {logs.length === 0 && status === 'running' && (
          <div className="text-zinc-600 italic">Initializing worker and starting test...</div>
        )}
        {logs.map((log, i) => {
          const isError = /error|failed|exception|❌/i.test(log);
          const isSuccess = /success|passed|✅/i.test(log);
          
          return (
            <div key={i} className="flex gap-2 mb-0.5 group">
              <span className="text-zinc-700 select-none">{i + 1}</span>
              <span className="text-indigo-900 select-none">›</span>
              <span className={`whitespace-pre-wrap ${isError ? 'text-red-400' : isSuccess ? 'text-green-400' : 'text-zinc-400'}`}>
                {log}
              </span>
            </div>
          );
        })}
        {status === 'running' && (
          <div className="flex gap-2 items-center">
             <span className="text-zinc-700 select-none">{logs.length + 1}</span>
             <span className="text-indigo-900 select-none">›</span>
             <span className="w-1.5 h-3 bg-indigo-500 animate-pulse inline-block" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isFailed = status === 'failed';
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
      isFailed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
    }`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="bg-[#111113] border border-white/5 px-6 py-3 rounded-2xl min-w-[120px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}