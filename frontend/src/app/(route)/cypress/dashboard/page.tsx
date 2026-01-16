'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getBuildDetails, getMasterTestCases, getTestSteps } from "@/lib/actions";
import { 
  Loader2, Zap, Target, CheckCircle2, XCircle, FileText, 
  Activity, ListFilter, ChevronRight, AlertTriangle 
} from "lucide-react";
import { StatusBadge } from "./_components/StatusBadge";
import { DashboardHeader } from "./_components/DashboardHeader";
import { MetricCard } from "./_components/MetricCard";
import { TestResultCard } from "./_components/TestResultCard";
import { cn } from "@/lib/utils";

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [buildDetails, setBuildDetails] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [specSearch, setSpecSearch] = useState('');

  // 1. Initial Load: Fetch Lightweight History
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
      const onlyCypress = history.filter((b: any) => b.type === 'cypress');
      setBuilds(onlyCypress);
      setMasterCases(master);
      
      if (onlyCypress.length > 0) {
        handleBuildSelect(onlyCypress[0].id);
      }
    } catch (e: any) {
      if (e.message?.includes('egress_quota')) setQuotaError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Focused Fetch: Get test list WITHOUT heavy steps
  const handleBuildSelect = async (buildId: number) => {
    setLoadingDetails(true);
    setExpandedTests([]); // Reset expansions for performance
    try {
      const details = await getBuildDetails(buildId);
      setSelectedBuild(builds.find(b => b.id === buildId));
      setBuildDetails(details);
    } catch (e: any) {
      if (e.message?.includes('egress_quota')) setQuotaError(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 3. Lazy Load Steps: Fetch only when a user clicks expand
  const toggleTest = async (uiId: string, dbTestId: string) => {
    const isOpening = !expandedTests.includes(uiId);
    
    // Toggle UI immediately
    setExpandedTests(prev => 
      prev.includes(uiId) ? prev.filter(x => x !== uiId) : [...prev, uiId]
    );

    if (isOpening) {
      // Find the test in our current state
      const specFileName = uiId.split('--')[0]; // Assuming ID structure: SpecName--TestTitle--ID
      
      // Fetch steps if they don't exist in local state
      try {
        const data = await getTestSteps(dbTestId);
        if (data) {
          setBuildDetails((prev: any) => {
            const newResults = [...prev.results];
            const spec = newResults.find(r => r.specFile === specFileName);
            const testObj = spec?.tests.find((t: any) => t.id === dbTestId);
            if (testObj) {
              testObj.steps = data.steps;
              testObj.stack_trace = data.stack_trace;
            }
            return { ...prev, results: newResults };
          });
        }
      } catch (e) {
        console.error("Step fetch failed", e);
      }
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Optimized grouping & metrics
  const buildMetrics = useMemo(() => {
    if (!buildDetails) return null;
    let p = 0, f = 0, r = 0;
    const automatedCodes = new Set<string>();
    buildDetails.results?.forEach((spec: any) => {
      spec.tests.forEach((t: any) => {
        if (t.status === 'passed') p++; else if (t.status === 'running') r++; else f++;
        t.case_codes?.forEach((c: string) => c !== 'N/A' && automatedCodes.add(c));
      });
    });
    return { passed: p, failed: f, running: r, automated: automatedCodes.size, percent: Math.round((automatedCodes.size / (masterCases.length || 1)) * 100) };
  }, [buildDetails, masterCases.length]);

  const specGroups = useMemo(() => {
    if (!buildDetails?.results) return {};
    return buildDetails.results.reduce((acc: any, res: any) => {
      const tests = res.tests.filter((t: any) => {
        const mStatus = filterStatus === 'all' || t.status === filterStatus;
        const mSearch = !specSearch || res.specFile.toLowerCase().includes(specSearch.toLowerCase());
        return mStatus && mSearch;
      });
      if (tests.length > 0) acc[res.specFile] = { tests };
      return acc;
    }, {});
  }, [buildDetails, filterStatus, specSearch]);

  if (quotaError) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#09090b] p-10 text-center">
      <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
      <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Database Restricted</h1>
      <p className="text-zinc-500 max-w-md text-sm leading-relaxed">Your Supabase project has exceeded its egress bandwidth quota. Data fetching is temporarily disabled by the provider.</p>
    </div>
  );

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#09090b] gap-4">
      <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
      <span className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em]">Initializing Systems</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col bg-[#0b0b0d] shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <span className="font-black text-[10px] uppercase tracking-widest text-zinc-500">Run History</span>
          <Activity className="w-3 h-3 text-indigo-500" />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {builds.map(b => (
            <button 
              key={b.id} 
              onClick={() => handleBuildSelect(b.id)} 
              className={cn(
                "w-full text-left p-6 border-b border-white/5 transition-all relative group",
                selectedBuild?.id === b.id ? 'bg-indigo-600/10' : 'hover:bg-white/5'
              )}
            >
              {selectedBuild?.id === b.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black text-white uppercase tracking-tighter">Build #{b.id}</span>
                <StatusBadge status={b.status} />
              </div>
              <p className="text-[10px] text-zinc-600 font-mono uppercase">{new Date(b.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main View */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="z-20 border-b border-white/5 p-6 bg-[#09090b]/50 backdrop-blur-xl">
          <DashboardHeader 
            selectedBuild={selectedBuild} 
            masterCases={masterCases} 
            filterStatus={filterStatus} 
            setFilterStatus={setFilterStatus} 
            specSearch={specSearch} 
            setSpecSearch={setSpecSearch} 
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          {loadingDetails ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-indigo-500 w-6 h-6" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Compiling Build Results...</span>
            </div>
          ) : (
            <>
              {buildMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard title="Coverage" value={`${buildMetrics.percent}%`} sub={`${buildMetrics.automated} Automated`} icon={<Target className="text-indigo-500" />} />
                  <MetricCard title="Passed" value={buildMetrics.passed} sub="Successful" icon={<CheckCircle2 className="text-emerald-500" />} />
                  <MetricCard title="Failed" value={buildMetrics.failed} sub="Critical" icon={<XCircle className="text-rose-500" />} />
                  <MetricCard title="Stability" value={`${Math.round((buildMetrics.passed / (buildMetrics.passed + buildMetrics.failed || 1)) * 100)}%`} sub="Overall Success" icon={<Zap className="text-yellow-500" />} />
                </div>
              )}

              {/* Spec Navigation */}
              <div className="flex flex-wrap gap-2 p-4 bg-white/5 rounded-3xl border border-white/5">
                <div className="flex items-center gap-2 mr-4 text-zinc-600">
                  <ListFilter className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Jump to:</span>
                </div>
                {Object.keys(specGroups).map(name => (
                  <button 
                    key={name}
                    onClick={() => document.getElementById(name)?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[9px] font-bold bg-zinc-800 hover:bg-indigo-500/20 hover:text-indigo-400 px-3 py-1.5 rounded-xl border border-white/5 transition-all"
                  >
                    {name.split('/').pop()}
                  </button>
                ))}
              </div>

              {/* Specs & Tests */}
              <div className="space-y-24 pb-20">
                {Object.entries(specGroups).map(([name, data]: [string, any]) => (
                  <div key={name} id={name} className="space-y-8 scroll-mt-40">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3 border-l-2 border-indigo-500 pl-4">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[11px] font-black text-zinc-200 uppercase tracking-widest">{name}</h3>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {data.tests.map((test: any, idx: number) => {
                        const uiId = `${name}--${test.title}--${idx}`;
                        return (
                          <TestResultCard 
                            key={uiId} 
                            test={test} 
                            isExpanded={expandedTests.includes(uiId)} 
                            onToggle={() => toggleTest(uiId, test.id)} 
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}