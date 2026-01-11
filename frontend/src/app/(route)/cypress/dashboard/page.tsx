'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "./_components/StatusBadge";
import { SpecFileCard } from "./_components/SpecFileCard";
import { DashboardHeader } from "./_components/DashboardHeader";
import { CoverageGap } from "./_components/CoverageGap";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [specSearch, setSpecSearch] = useState('');

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
      setBuilds(history);
      setMasterCases(master);
      if (history?.length > 0) {
        setSelectedBuild((current: any) => history.find((b: any) => b.id === (current?.id || history[0].id)) || history[0]);
      }
    } catch (e) { console.error(e); } finally { if (isInitial) setLoading(false); }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(false); }, 2000);
    const channel = supabase.channel('db-changes').on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'test_results'
    }, () => loadData(false)).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const masterMap = useMemo(() => masterCases.reduce((acc, tc) => ({ ...acc, [tc.caseCode]: tc }), {}), [masterCases]);

  // 🔥 CORE LOGIC: Group all tests from all result rows by their Spec File Name
  const specGroups = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, result: any) => {
      const fileName = result.specFile;
      
      // Filter Spec File by search
      if (specSearch && !fileName.toLowerCase().includes(specSearch.toLowerCase())) return acc;

      const filteredTests = result.tests.filter((test: any) => {
        const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
        const matchesProject = projectSearch === '' || test.project?.toLowerCase().includes(projectSearch.toLowerCase());
        return matchesStatus && matchesProject;
      });

      if (filteredTests.length > 0) {
        if (!acc[fileName]) {
          acc[fileName] = { specFile: fileName, tests: [], video: null };
        }
        // Use the first video found for this spec group
        if (!acc[fileName].video) {
          acc[fileName].video = filteredTests.find((t: any) => t.video_url)?.video_url;
        }
        acc[fileName].tests.push(...filteredTests.map((t: any) => ({ ...t, specId: result.id, specFile: fileName })));
      }
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, projectSearch, specSearch]);

  const toggleTest = (id: string) => setExpandedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => setSelectedBuild(b)} className={`w-full text-left p-5 border-b border-white/5 transition-all ${selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-white">BUILD #{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase">{new Date(b.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-12">
        <DashboardHeader 
          selectedBuild={selectedBuild} masterCases={masterCases} 
          filterStatus={filterStatus} setFilterStatus={setFilterStatus} 
          projectSearch={projectSearch} setProjectSearch={setProjectSearch}
          specSearch={specSearch} setSpecSearch={setSpecSearch}
        />
        
        <div className="space-y-16">
          {Object.entries(specGroups || {}).sort().map(([name, data]: [string, any]) => (
            <SpecFileCard 
              key={name} projectName={name} data={data} 
              masterMap={masterMap} expandedTests={expandedTests} toggleTest={toggleTest} 
            />
          ))}
        </div>

        <CoverageGap selectedBuild={selectedBuild} masterCases={masterCases} filterStatus={filterStatus} />
      </main>
    </div>
  );
}