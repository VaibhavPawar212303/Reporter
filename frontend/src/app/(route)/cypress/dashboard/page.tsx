'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Zap, Target, CheckCircle2, XCircle, FileText } from "lucide-react";
import { StatusBadge } from "./_components/StatusBadge";
import { DashboardHeader } from "./_components/DashboardHeader";
import { CoverageGap } from "./_components/CoverageGap";
import { MetricCard } from "./_components/MetricCard";
import { TestResultCard } from "./_components/TestResultCard";
import { cn } from "@/lib/utils";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [specSearch, setSpecSearch] = useState('');

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
      const onlyCypress = history.filter((b: any) => b.type === 'cypress');
      setBuilds(onlyCypress);
      setMasterCases(master);
      if (onlyCypress.length > 0 && !selectedBuild) setSelectedBuild(onlyCypress[0]);
    } catch (e) { console.error(e); } finally { if (isInitial) setLoading(false); }
  }, [selectedBuild]);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const buildMetrics = useMemo(() => {
    if (!selectedBuild) return null;
    let p = 0, f = 0, r = 0;
    const codes = new Set<string>();
    selectedBuild.results?.forEach((s: any) => s.tests.forEach((t: any) => {
      if (t.status === 'passed') p++; else if (t.status === 'running') r++; else f++;
      t.case_codes?.forEach((c: string) => c !== 'N/A' && codes.add(c));
    }));
    return { passed: p, failed: f, running: r, automated: codes.size, percent: Math.round((codes.size / (masterCases.length || 1)) * 100) };
  }, [selectedBuild, masterCases]);

  const specGroups = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, res: any) => {
      if (specSearch && !res.specFile.toLowerCase().includes(specSearch.toLowerCase())) return acc;
      const tests = res.tests.filter((t: any) => filterStatus === 'all' || t.status === filterStatus);
      if (tests.length > 0) acc[res.specFile] = { tests };
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, specSearch]);

  const toggleTest = (id: string) => setExpandedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d] shrink-0">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-widest text-zinc-500">Run History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => setSelectedBuild(b)} className={cn("w-full text-left p-6 border-b border-white/5 transition-all", selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-indigo-500' : 'hover:bg-white/5')}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-white uppercase tracking-tighter">Build #{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase">{new Date(b.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-12">
        <DashboardHeader selectedBuild={selectedBuild} masterCases={masterCases} filterStatus={filterStatus} setFilterStatus={setFilterStatus} specSearch={specSearch} setSpecSearch={setSpecSearch} />

        {buildMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard title="Coverage" value={`${buildMetrics.percent}%`} sub={`${buildMetrics.automated} Automated`} icon={<Target className="text-indigo-500" />} />
            <MetricCard title="Passed" value={buildMetrics.passed} sub="Successful" icon={<CheckCircle2 className="text-emerald-500" />} />
            <MetricCard title="Failed" value={buildMetrics.failed} sub="Critical" icon={<XCircle className="text-rose-500" />} />
            <MetricCard title="Stability" value={`${Math.round((buildMetrics.passed / (buildMetrics.passed + buildMetrics.failed || 1)) * 100)}%`} sub="Overall Success" icon={<Zap className="text-yellow-500" />} />
          </div>
        )}

        <div className="space-y-16">
          {Object.entries(specGroups || {}).map(([name, data]: [string, any]) => (
            <div key={name} className="space-y-8">
              <div className="flex items-center gap-3 px-2 border-l-2 border-indigo-500">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{name}</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {data.tests.map((test: any, idx: number) => {
                  const id = `${name}-${test.id}-${idx}`;
                  return <TestResultCard key={id} test={test} isExpanded={expandedTests.includes(id)} onToggle={() => toggleTest(id)} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}