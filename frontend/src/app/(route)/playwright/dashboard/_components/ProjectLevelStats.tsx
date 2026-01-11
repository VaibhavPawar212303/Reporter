// _components/ProjectLevelStats.tsx
import React from 'react';

interface ProjectLevelStatsProps {
  tests: any[];
}

export function ProjectLevelStats({ tests }: ProjectLevelStatsProps) {
  // Aggregate data for this specific project
  const passed = tests.filter(t => t.status === 'passed' || t.status === 'expected').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const active = tests.filter(t => t.status === 'running').length;

  return (
    <div className="flex gap-4 items-center bg-black/20 px-5 py-2 rounded-2xl border border-white/5 shadow-inner">
      {/* Passed Count */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-green-500 leading-none">{passed}</span>
        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mt-1">Passed</span>
      </div>

      <div className="w-px h-6 bg-white/5" />

      {/* Failed Count */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-red-500 leading-none">{failed}</span>
        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter mt-1">Failed</span>
      </div>

      {/* Active/Running Count - Only shows if tests are currently executing */}
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