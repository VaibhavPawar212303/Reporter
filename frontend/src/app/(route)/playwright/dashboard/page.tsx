'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Hash, Activity, Search, Cpu, Monitor } from "lucide-react";

// Import distributed components
import { StatusBadge } from "./_components/StatusBadge";
import { FilterButton } from "./_components/FilterButton";
import { ProjectLevelStats } from "./_components/ProjectLevelStats";
import { TestRow } from "./_components/TestRow";
import { cn } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PlaywrightDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');

  // 🔥 1. Filter builds to show ONLY Playwright type for the sidebar
  const playwrightBuilds = useMemo(() => {
    return builds.filter(b => b.type === 'playwright');
  }, [builds]);

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await getBuildHistory();
      const master = await getMasterTestCases();
      
      setBuilds(data);
      setMasterCases(master);

      if (data?.length > 0) {
        // 🔥 2. Filter data for auto-selection logic
        const onlyPlaywright = data.filter((b: any) => b.type === 'playwright');
        
        if (onlyPlaywright.length > 0) {
          setSelectedBuild((current: any) => {
            // Try to maintain current selection if it's still in the list
            const found = onlyPlaywright.find((b: any) => b.id === (current?.id || onlyPlaywright[0].id));
            return found || onlyPlaywright[0];
          });
        }
      }
    } catch (error) { 
      console.error("Failed to load builds:", error); 
    } finally { 
      if (isInitial) setLoading(false); 
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(false); }, 2000);
    const channel = supabase.channel('db-changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_results' }, () => loadData(false)).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const stats = useMemo(() => {
    const s = { total: 0, passed: 0, failed: 0, running: 0 };
    selectedBuild?.results?.forEach((spec: any) => {
      spec.tests.forEach((t: any) => {
        s.total++;
        if (t.status === 'running') s.running++;
        else if (t.status === 'passed' || t.status === 'expected') s.passed++;
        else s.failed++;
      });
    });
    return s;
  }, [selectedBuild]);

  const filteredProjects = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, spec: any) => {
      spec.tests.forEach((test: any) => {
        const projectName = test.project || "Default";
        const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
        const matchesSearch = projectName.toLowerCase().includes(projectSearch.toLowerCase());
        const matchesDropdown = selectedProjectFilter === 'all' || selectedProjectFilter === projectName;

        if (matchesStatus && matchesSearch && matchesDropdown) {
          if (!acc[projectName]) acc[projectName] = [];
          acc[projectName].push({ ...test, specFile: spec.specFile, specId: spec.id });
        }
      });
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, projectSearch, selectedProjectFilter]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b] text-indigo-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Sidebar: Shows ONLY Playwright Builds */}
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex justify-between items-center">
          <span>Playwright History</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        
        {playwrightBuilds.length === 0 ? (
           <div className="p-10 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
             No Playwright Builds
           </div>
        ) : playwrightBuilds.map(b => (
          <button 
            key={b.id} 
            onClick={() => setSelectedBuild(b)} 
            className={cn(
                "w-full text-left p-5 border-b border-white/5 transition-all",
                selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5'
            )}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-tighter">Build #{b.id}</span>
                {/* Visual indicator for Playwright */}
                <span className="text-[7px] px-1.5 py-0.5 rounded font-black bg-green-500/10 text-green-500 border border-green-500/20">PW</span>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight">
                {new Date(b.createdAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-10">
        {/* Main Content Header */}
        <header className="flex flex-col gap-8">
          <div className="flex justify-between items-start">
            <div>
               <h1 className="text-4xl font-black text-white tracking-tighter">Build #{selectedBuild?.id}</h1>
               <p className="text-zinc-500 text-sm font-medium mt-1">Playwright environment execution metrics</p>
            </div>
            {stats.running > 0 && (
              <span className="flex items-center gap-2 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl animate-pulse text-xs font-black text-indigo-500 uppercase tracking-widest">
                <Activity className="w-4 h-4" /> Live Syncing
              </span>
            )}
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
              <FilterButton active={filterStatus === 'all'} label="All" count={stats.total} onClick={() => setFilterStatus('all')} color="zinc" />
              <FilterButton active={filterStatus === 'passed'} label="Passed" count={stats.passed} onClick={() => setFilterStatus('passed')} color="green" />
              <FilterButton active={filterStatus === 'failed'} label="Failed" count={stats.failed} onClick={() => setFilterStatus('failed')} color="red" />
              <FilterButton active={filterStatus === 'running'} label="Running" count={stats.running} onClick={() => setFilterStatus('running')} color="indigo" />
            </div>
            <div className="flex items-center gap-3 px-4 bg-[#111113] border border-white/5 rounded-2xl">
              <Search className="w-4 h-4 text-zinc-600" />
              <input 
                value={projectSearch} 
                onChange={e => setProjectSearch(e.target.value)} 
                placeholder="Search project name..." 
                className="bg-transparent border-none focus:ring-0 text-sm py-3 w-full text-zinc-300" 
              />
            </div>
          </div>
        </header>

        {/* Project List */}
        <div className="space-y-12">
          {Object.entries(filteredProjects || {}).map(([projectName, tests]: [string, any]) => (
            <div key={projectName} className="bg-[#0c0c0e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Cpu className="w-6 h-6 text-indigo-500" />
                  </div>
                  <span className="text-xl font-black text-white tracking-tight">{projectName}</span>
                </div>
                <ProjectLevelStats tests={tests} />
              </div>
              <div className="divide-y divide-white/5">
                {tests.map((test: any, idx: number) => (
                  <TestRow 
                    key={idx} 
                    test={test} 
                    // Master Map logic would go here if needed
                    isExpanded={expandedTests.includes(`${test.specId}-${projectName}-${test.title}`)} 
                    onToggle={() => setExpandedTests(prev => prev.includes(`${test.specId}-${projectName}-${test.title}`) ? prev.filter(id => id !== `${test.specId}-${projectName}-${test.title}`) : [...prev, `${test.specId}-${projectName}-${test.title}`])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}