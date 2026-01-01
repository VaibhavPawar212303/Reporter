'use client';

import { useEffect, useState } from "react";
import { getBuildHistory } from "@/lib/actions"; 
import { createClient } from "@supabase/supabase-js";
import { 
  CheckCircle2, XCircle, FileCode, Folder, Loader2, 
  Terminal, Hash, Video, ExternalLink, Activity
} from "lucide-react";

// Initialize Supabase for Realtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await getBuildHistory();
      setBuilds(data);
      // Maintain selection on refresh
      if (data?.length > 0) {
        setBuilds(current => {
          if (selectedBuild) {
            const updatedSelected = data.find((b: any) => b.id === selectedBuild.id);
            setSelectedBuild(updatedSelected || data[0]);
          } else {
            setSelectedBuild(data[0]);
          }
          return data;
        });
      }
    } catch (error) {
      console.error("Failed to load builds:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 🔥 LIVE MODE: Subscribe to database changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'test_results' },
        (payload) => {
          console.log('Realtime update received:', payload.new);
          
          // Update the specific build in the list
          setBuilds((currentBuilds) => 
            currentBuilds.map((build) => {
              if (build.id === payload.new.build_id) {
                const updatedResults = build.results.map((spec: any) => 
                  spec.id === payload.new.id ? payload.new : spec
                );
                
                const updatedBuild = { ...build, results: updatedResults };
                
                // If this is the build currently being viewed, update the detail view
                if (selectedBuild?.id === build.id) {
                  setSelectedBuild(updatedBuild);
                }
                
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
  }, [selectedBuild?.id]);

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
      {/* Sidebar */}
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
              <p className="text-[10px] text-zinc-500 font-mono">
                {new Date(build.createdAt).toLocaleDateString()}
              </p>
              <span className="text-[9px] text-zinc-600 font-bold uppercase">{build.environment}</span>
            </div>
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 bg-[#09090b]">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Hash className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">Build #{selectedBuild?.id}</h1>
                {stats.running > 0 && <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-md animate-pulse">
                  <Activity className="w-3 h-3" /> LIVE
                </span>}
              </div>
              <p className="text-zinc-500 text-sm font-medium">Platform: Playwright / Cypress</p>
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
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {suitePath}
            </h3>
          </div>

          <div className="ml-2 pl-8 border-l border-white/5 space-y-6">
            {suiteTests.map((test: any, idx: number) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    {/* STATUS ICONS INCLUDING RUNNING SPINNER */}
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

                {/* 🔥 LIVE WORKER LOGS SECTION */}
                {test.logs && test.logs.length > 0 && (
                  <div className="mt-3 ml-12 p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-[10px] text-zinc-500 max-h-40 overflow-y-auto">
                    {test.logs.map((log: string, i: number) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-indigo-900 shrink-0">›</span>
                        <span className="whitespace-pre-wrap">{log}</span>
                      </div>
                    ))}
                  </div>
                )}

                {test.video_url && (
                  <div className="mt-4 ml-12 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[9px] font-black uppercase tracking-widest text-indigo-400">
                        <Video className="w-3 h-3" /> Recording
                      </span>
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BrowserBadge({ name, color }: { name: string, color: string }) {
  return <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${color}`}>{name}</span>;
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