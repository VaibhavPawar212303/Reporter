import React, { useMemo } from "react";
import { Search, FileCode, Monitor } from "lucide-react";
import { FilterButton } from "./FilterButton";

export function DashboardHeader({ 
  selectedBuild, 
  masterCases, 
  filterStatus, 
  setFilterStatus, 
  projectSearch, 
  setProjectSearch,
  specSearch,
  setSpecSearch 
}: any) {
  
  // Calculate Build Stats...
  const buildStats = useMemo(() => {
    const stats = { total: 0, passed: 0, failed: 0, running: 0 };
    selectedBuild?.results?.forEach((spec: any) => {
      spec.tests.forEach((t: any) => {
        stats.total++;
        if (t.status === 'running') stats.running++;
        else if (t.status === 'passed' || t.status === 'expected') stats.passed++;
        else stats.failed++;
      });
    });
    return stats;
  }, [selectedBuild]);

  return (
    <header className="flex flex-col gap-8">
      {/* Build Info and Coverage Circle logic remains same... */}
      <div className="flex justify-between items-start">
         <h1 className="text-4xl font-black text-white tracking-tighter">Build #{selectedBuild?.id}</h1>
         {/* Coverage gauge here... */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
          <FilterButton active={filterStatus === 'all'} label="All" count={buildStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
          <FilterButton active={filterStatus === 'passed'} label="Passed" count={buildStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
          <FilterButton active={filterStatus === 'failed'} label="Failed" count={buildStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
          <FilterButton active={filterStatus === 'running'} label="Running" count={buildStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
        </div>

        {/* Dual Search: Project and Spec File */}
        <div className="grid grid-cols-2 gap-4 bg-[#111113] border border-white/5 p-2 rounded-2xl">
          {/* Project Search */}
          <div className="flex items-center gap-3 px-3 bg-black/20 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
            <Monitor className="w-3.5 h-3.5 text-zinc-600" />
            <input 
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Filter Project..."
              className="bg-transparent border-none focus:ring-0 text-xs py-2 w-full text-zinc-300 placeholder:text-zinc-600"
            />
          </div>

          {/* 🔥 Spec Search */}
          <div className="flex items-center gap-3 px-3 bg-black/20 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
            <FileCode className="w-3.5 h-3.5 text-zinc-600" />
            <input 
              value={specSearch}
              onChange={(e) => setSpecSearch(e.target.value)}
              placeholder="Filter Spec File..."
              className="bg-transparent border-none focus:ring-0 text-xs py-2 w-full text-zinc-300 placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>
    </header>
  );
}