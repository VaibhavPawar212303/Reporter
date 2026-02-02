'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBuildHistory, getCypressBuildDetails, getMasterTestCases, getCypressTestSteps, getCypressGlobalStats, getCypressTrend } from "@/lib/actions";
import { Loader2, Zap, Target, FileText, Activity, LayoutDashboard, TrendingUp, Monitor, Clock, Server, Command, Box, Calendar, X, ListTree } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { StatusBadge } from "./_components/StatusBadge";
import { DashboardHeader } from "./_components/DashboardHeader";
import { TestResultCard } from "./_components/TestResultCard";
import { BuildIntelligencePanel } from "./_components/BuildIntelligencePanel";
import { cn } from "@/lib/utils";
import { BuildTestCaseTracker } from "./_components/BuildTestCaseTracker";

const getEffectiveStatus = (status: string) => {
  const s = status?.toLowerCase();
  if (['passed', 'expected', 'success'].includes(s)) return 'passed';
  if (['failed', 'error', 'fail'].includes(s)) return 'failed';
  if (s === 'running') return 'running';
  return 'skipped';
};

function AutomationDashboardContent() {
  const searchParams = useSearchParams();
  const urlBuildId = searchParams.get('buildId');
  const urlProjectId = searchParams.get('projectId');

  const [builds, setBuilds] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [buildDetails, setBuildDetails] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [specSearch, setSpecSearch] = useState('');
  const [showRequirementAnalysis, setShowRequirementAnalysis] = useState(false);

  const allTestsInBuild = useMemo(() => {
    if (!buildDetails?.results) return [];
    return buildDetails.results.flatMap((spec: any) => {
      let tests = [];
      try {
          tests = typeof spec.tests === 'string' ? JSON.parse(spec.tests) : spec.tests;
      } catch (e) { tests = []; }
      return (tests || []).map((t: any) => ({
        ...t,
        specFile: spec.specFile,
        specId: spec.id
      }));
    });
  }, [buildDetails]); 

  const [isHydrated, setIsHydrated] = useState<number | null>(null);
  const hydrateAllSteps = useCallback(async (details: any) => {
    if (!details?.results || isHydrated === details.id) return;
    const updatedResults = [...details.results];
    try {
      for (const spec of updatedResults) {
        const tests = typeof spec.tests === 'string' ? JSON.parse(spec.tests) : spec.tests;
        const hydratedTests = await Promise.all(
          tests.map(async (test: any) => {
            if (test.steps && test.steps.length > 0) return test;
            const stepData = await getCypressTestSteps(spec.id, test.title);
            return { ...test, ...stepData };
          })
        );
        spec.tests = hydratedTests;
        setBuildDetails((prev: any) => {
          if (!prev || prev.id !== details.id) return prev;
          return {
            ...prev,
            results: prev.results.map((r: any) => r.id === spec.id ? { ...spec } : r)
          };
        });
      }
      setIsHydrated(details.id);
    } catch (error) {
      console.error("Hydration Interrupted:", error);
    }
  }, [isHydrated]);

  const handleBuildSelect = async (build: any) => {
    setIsHydrated(null);
    setSelectedBuild(build);
    setLoadingDetails(true);
    const details = await getCypressBuildDetails(build.id);
    setBuildDetails(details);
    setLoadingDetails(false);
    hydrateAllSteps(details);
  }; 

  const loadDirectBuild = useCallback(async (buildId: string) => {
    try {
      setIsHydrated(null); 
      setLoading(true);
      setLoadingDetails(true);
      const details = await getCypressBuildDetails(Number(buildId));
      setBuildDetails(details);
      setSelectedBuild(details);
      hydrateAllSteps(details);
    } finally {
      setLoading(false);
      setLoadingDetails(false);
    }
  }, [hydrateAllSteps]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [history, master, stats, trend] = await Promise.all([
        getBuildHistory(), getMasterTestCases(), getCypressGlobalStats(), getCypressTrend()
      ]);
      setBuilds(history.filter((b: any) => b.type?.toLowerCase() === 'cypress'));
      setMasterCases(master);
      setGlobalStats(stats);
      setTrendData(trend);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (urlBuildId) {
      const bId = Number(urlBuildId);
      if (!buildDetails || buildDetails.id !== bId) {
        loadDirectBuild(urlBuildId);
      }
    } else {
      if (builds.length === 0) {
        loadInitialData();
      }
    }
  }, [urlBuildId, builds.length]);

  const toggleTest = async (uiId: string, specId: number, title: string) => {
    const isOpening = !expandedTests.includes(uiId);
    setExpandedTests(prev => isOpening ? [...prev, uiId] : prev.filter(x => x !== uiId));
  };

  const specGroups = useMemo(() => {
    if (!buildDetails?.results) return {};
    return buildDetails.results.reduce((acc: any, res: any) => {
      const filtered = res.tests?.filter((t: any) => {
        const effective = getEffectiveStatus(t.status);
        const matchesStatus = filterStatus === 'all' || effective === filterStatus;
        const matchesSearch = !specSearch || res.specFile.toLowerCase().includes(specSearch.toLowerCase());
        return matchesStatus && matchesSearch;
      });

      const specStats = res.tests?.reduce((s: any, t: any) => {
        const effective = getEffectiveStatus(t.status);
        if (effective === 'passed') s.passed++;
        if (effective === 'failed') s.failed++;
        return s;
      }, { passed: 0, failed: 0 });

      if (filtered?.length > 0) {
        acc[res.specFile] = {
          id: res.id,
          tests: filtered,
          stats: specStats,
          totalTests: res.tests?.length || 0,
          env: res.envInfo
        };
      }
      return acc;
    }, {});
  }, [buildDetails, filterStatus, specSearch]);
  
  if (loading && !buildDetails) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-muted animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground font-sans selection:bg-indigo-500/30 overflow-hidden transition-colors duration-300">
      {!urlBuildId && (
        <aside className="w-80 border-r border-border bg-background flex flex-col shrink-0">
          <div className="p-5 border-b border-border bg-card/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server size={14} className="text-muted" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Registry</span>
            </div>
            <button
              onClick={() => { setSelectedBuild(null); setBuildDetails(null); setShowRequirementAnalysis(false); }}
              className="p-1.5 hover:bg-muted/10 rounded-sm transition-colors text-muted"
            >
              <LayoutDashboard size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {builds.map(b => (
              <button 
                key={b.id} 
                onClick={() => handleBuildSelect(b)} 
                className={cn(
                  "w-full text-left p-4 rounded-sm transition-all border group relative", 
                  selectedBuild?.id === b.id 
                    ? "bg-card border-border shadow-inner" 
                    : "bg-transparent border-transparent hover:bg-muted/10"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono font-bold text-foreground uppercase">Build_Ref_{b.id}</span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="flex items-center gap-3 text-[9px] text-muted font-bold uppercase">
                  <Calendar size={10} /> {new Date(b.createdAt).toLocaleDateString()} 
                  <span className="opacity-30">•</span> {b.environment}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {!selectedBuild ? (
            <div className="space-y-8 animate-in fade-in duration-700">
              <header className="border-b border-border pb-8 uppercase tracking-widest">
                <h1 className="text-3xl font-bold text-foreground">Cypress Command Center</h1>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Builds" value={globalStats?.totalBuilds ?? 0} icon={<Activity size={18} />} color="zinc" />
                <StatCard title="Scenarios" value={globalStats?.totalTestsExecuted ?? 0} icon={<Target size={18} />} color="indigo" />
                <StatCard title="Stability" value={`${globalStats?.lifetimePassRate ?? 0}%`} icon={<Zap size={18} />} color="emerald" />
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* --- ACTION HEADER --- */}
              <div className="flex justify-between items-center bg-card/20 p-4 border border-border">
                 <div className="flex items-center gap-4">
                   <div className="p-2 bg-indigo-500/10 border border-indigo-500/20"><Command size={16} className="text-indigo-500" /></div>
                   <h2 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">
                     Build_Registry / ID: {selectedBuild.id}
                   </h2>
                 </div>
                 
                 <button 
                  onClick={() => setShowRequirementAnalysis(!showRequirementAnalysis)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all border",
                    showRequirementAnalysis 
                      ? "bg-foreground text-background border-foreground" 
                      : "bg-indigo-600/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                  )}
                 >
                   {showRequirementAnalysis ? <X size={14} /> : <ListTree size={14} />}
                   {showRequirementAnalysis ? "Close_Analysis" : "Build_Requirement_Analysis"}
                 </button>
              </div>

              {showRequirementAnalysis ? (
                <div className="animate-in slide-in-from-bottom-2 duration-500">
                  <BuildTestCaseTracker allTests={allTestsInBuild} buildId={selectedBuild.id} />
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <DashboardHeader selectedBuild={buildDetails || selectedBuild} masterCases={masterCases} filterStatus={filterStatus} setFilterStatus={setFilterStatus} specSearch={specSearch} setSpecSearch={setSpecSearch} />
                  {!loadingDetails && buildDetails && <BuildIntelligencePanel buildId={selectedBuild?.id} buildData={buildDetails} />}
                  
                  {loadingDetails ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4 text-muted">
                      <Loader2 className="animate-spin w-6 h-6" />
                      <span className="text-[9px] font-mono uppercase tracking-widest">Extracting_Artifacts_From_Registry</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(specGroups).map(([name, group]: [string, any]) => (
                        <div key={name} className="bg-card border border-border rounded-none overflow-hidden flex flex-col shadow-xl">
                          <div className="px-6 py-4 border-b border-border bg-card/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className="p-2 border border-border"><FileText size={14} className="text-muted" /></div>
                              <h3 className="text-xs font-bold text-foreground font-mono uppercase">{name.split('/').pop()}</h3>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-32 h-1 bg-border rounded-none overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${(group.stats.passed / group.totalTests) * 100}%` }} />
                                <div className="h-full bg-rose-500" style={{ width: `${(group.stats.failed / group.totalTests) * 100}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-muted">{group.stats.passed}/{group.totalTests} PASS</span>
                            </div>
                          </div>
                          <div className="divide-y divide-border/30">
                            {group.tests.map((t: any, idx: number) => (
                              <TestResultCard key={`${name}-${idx}`} test={t} isExpanded={expandedTests.includes(`${name}-${idx}`)} onToggle={() => toggleTest(`${name}-${idx}`, group.id, t.title)} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AutomationDashboard() {
  return (
    <Suspense fallback={<div className="h-screen flex flex-col items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-muted animate-spin" /></div>}>
      <AutomationDashboardContent />
    </Suspense>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const accents: any = { indigo: 'border-t-indigo-500', emerald: 'border-t-emerald-500', zinc: 'border-t-border' };
  return (
    <div className={cn("bg-card border border-border border-t-2 rounded-none p-8 flex flex-col justify-between min-h-[160px]", accents[color])}>
      <div className="text-muted">{icon}</div>
      <div>
        <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{title}</h3>
        <div className="text-5xl font-bold text-foreground tracking-tighter font-mono">{value ?? '0'}</div>
      </div>
    </div>
  );
}