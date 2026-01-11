'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "./_components/StatusBadge";
import { SpecFileCard } from "./_components/SpecFileCard";
import { DashboardHeader } from "./_components/DashboardHeader";
import { CoverageGap } from "./_components/CoverageGap";
import { cn } from "@/lib/utils"; // Ensure you have your cn utility

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

  // 🔥 1. Filter builds to show ONLY Cypress type
  const cypressBuilds = useMemo(() => {
    return builds.filter(b => b.type === 'cypress' || 'Cypress');
  }, [builds]);

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
      
      setBuilds(history);
      setMasterCases(master);

      if (history?.length > 0) {
        // 🔥 2. Auto-select only from Cypress builds
        const onlyCypress = history.filter((b: any) => b.type === 'cypress');
        if (onlyCypress.length > 0) {
          setSelectedBuild((current: any) => {
            const found = onlyCypress.find((b: any) => b.id === (current?.id || onlyCypress[0].id));
            return found || onlyCypress[0];
          });
        }
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

  const specGroups = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, result: any) => {
      const fileName = result.specFile;
      if (specSearch && !fileName.toLowerCase().includes(specSearch.toLowerCase())) return acc;

      const filteredTests = result.tests.filter((test: any) => {
        const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
        const matchesProject = projectSearch === '' || test.project?.toLowerCase().includes(projectSearch.toLowerCase());
        return matchesStatus && matchesProject;
      });

      if (filteredTests.length > 0) {
        if (!acc[fileName]) acc[fileName] = { specFile: fileName, tests: [], video: null };
        if (!acc[fileName].video) acc[fileName].video = filteredTests.find((t: any) => t.video_url)?.video_url;
        acc[fileName].tests.push(...filteredTests.map((t: any) => ({ ...t, specId: result.id, specFile: fileName })));
      }
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, projectSearch, specSearch]);

  const toggleTest = (id: string) => setExpandedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Sidebar: Show ONLY Cypress Builds */}
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d]">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex justify-between items-center">
          <span>Cypress History</span>
          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[8px] border border-indigo-500/20">LIVE</span>
        </div>
        {cypressBuilds.length === 0 ? (
           <div className="p-10 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">No Cypress Builds Found</div>
        ) : cypressBuilds.map(b => (
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
                {/* Visual Framework Indicator */}
                <span className="text-[7px] px-1.5 py-0.5 rounded font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">CY</span>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight">
                {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
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