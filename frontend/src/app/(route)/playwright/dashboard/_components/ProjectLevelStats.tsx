// _components/ProjectLevelStats.tsx
'use client';

import React from 'react';

interface ProjectLevelStatsProps {
  tests: any[];
}

export function ProjectLevelStats({ tests }: ProjectLevelStatsProps) {
  // Aggregate data for this specific project (Browser/Worker)
  // Standardized to use the lowercase statuses from our TiDB normalizer
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const active = tests.filter(t => t.status === 'running').length;
  
  // Calculate stability for this specific project
  const totalFinished = passed + failed;
  const stability = totalFinished > 0 
    ? Math.round((passed / totalFinished) * 100) 
    : 0;

  return (
    <div className="flex gap-6 items-center bg-black/40 px-6 py-2 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm">
      
      {/* Project Stability Metric */}
      <div className="flex flex-col items-end pr-2 border-r border-white/5">
        <span className="text-[10px] font-black text-white leading-none">{stability}%</span>
        <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Stability</span>
      </div>

      {/* Passed Count */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-emerald-500 leading-none">{passed}</span>
        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mt-1">Passed</span>
      </div>

      <div className="w-px h-6 bg-white/5" />

      {/* Failed Count */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-rose-500 leading-none">{failed}</span>
        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mt-1">Failed</span>
      </div>

      {/* Active/Running Count - Pulses when workers are pushing to TiDB */}
      {active > 0 && (
        <>
          <div className="w-px h-6 bg-white/5" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-indigo-400 animate-pulse leading-none">{active}</span>
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mt-1">Active</span>
          </div>
        </>
      )}
    </div>
  );
}