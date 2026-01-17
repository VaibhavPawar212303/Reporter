'use client';

import React, { useMemo } from "react";
import { FileCode, Monitor, Target, Cpu } from "lucide-react";
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
  
  // 1. Calculate Build Stats 
  // We use useMemo to ensure stats update only when selectedBuild actually changes
  const buildStats = useMemo(() => {
    const stats = { total: 0, passed: 0, failed: 0, running: 0, automatedCount: 0 };
    const automatedCodes = new Set<string>();

    // Safety check: ensure selectedBuild and results exist
    if (selectedBuild && Array.isArray(selectedBuild.results)) {
      selectedBuild.results.forEach((spec: any) => {
        // In TiDB, 'tests' is the JSON array column
        if (Array.isArray(spec.tests)) {
          spec.tests.forEach((t: any) => {
            stats.total++;
            
            // Check status (supporting both lowercase/uppercase from different runners)
            const status = t.status?.toLowerCase();
            if (status === 'running') stats.running++;
            else if (status === 'passed' || status === 'expected' || status === 'success') stats.passed++;
            else stats.failed++;

            // Count Automated Case Codes (TC123...)
            if (Array.isArray(t.case_codes)) {
              t.case_codes.forEach((code: string) => {
                if (code && code !== 'N/A') automatedCodes.add(code);
              });
            }
          });
        }
      });
    }

    stats.automatedCount = automatedCodes.size;
    return stats;
  }, [selectedBuild]);

  // 2. Coverage Calculation (Safety check for divide by zero)
  const masterCount = masterCases?.length || 0;
  const coveragePercent = masterCount > 0 
    ? Math.round((buildStats.automatedCount / masterCount) * 100) 
    : 0;

  return (
    <header className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Cpu className="w-5 h-5 text-indigo-500" />
             </div>
             {/* Fallback to '---' if ID is missing */}
             <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
               Build #{selectedBuild?.id ?? '---'}
             </h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] pl-12">
            {selectedBuild?.environment || 'loading...'} • {selectedBuild?.type || 'automation'}
          </p>
        </div>

        {/* Coverage Circular Gauge */}
        <div className="flex items-center gap-4 bg-white/5 p-3 pr-6 rounded-3xl border border-white/5">
            <div className="relative w-12 h-12 flex items-center justify-center">
               <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                  <circle 
                    cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" 
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * coveragePercent) / 100}
                    className="text-indigo-500 transition-all duration-500" 
                  />
               </svg>
               <span className="absolute text-[10px] font-black text-white">{coveragePercent}%</span>
            </div>
            <div>
               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Master Coverage</p>
               <p className="text-xs font-bold text-zinc-300">{buildStats.automatedCount} / {masterCount} Cases</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
          <FilterButton active={filterStatus === 'all'} label="All" count={buildStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
          <FilterButton active={filterStatus === 'passed'} label="Passed" count={buildStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
          <FilterButton active={filterStatus === 'failed'} label="Failed" count={buildStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
          <FilterButton active={filterStatus === 'running'} label="Running" count={buildStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
        </div>

        {/* Dual Search Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#111113] border border-white/5 p-2 rounded-2xl">
          <div className="flex items-center gap-3 px-3 bg-black/20 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
            <Monitor className="w-3.5 h-3.5 text-zinc-600" />
            <input 
              value={projectSearch || ''}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Filter Browser..."
              className="bg-transparent border-none focus:ring-0 text-xs py-2 w-full text-zinc-300 placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-center gap-3 px-3 bg-black/20 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
            <FileCode className="w-3.5 h-3.5 text-zinc-600" />
            <input 
              value={specSearch || ''}
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