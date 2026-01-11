import React, { useMemo } from "react";
import { Stethoscope, Layers, Hash, BookOpenCheck } from "lucide-react";

export function CoverageGap({ selectedBuild, masterCases, filterStatus }: any) {
  
  const missing = useMemo(() => {
    if (!selectedBuild || masterCases.length === 0) return [];
    
    // 1. Get all codes found in the automation results
    const automatedCodes = new Set<string>();
    selectedBuild.results?.forEach((spec: any) => {
      spec.tests.forEach((test: any) => {
        const codes = test.case_codes || (test.case_code ? [test.case_code] : []);
        codes.forEach((c: string) => automatedCodes.add(c));
      });
    });

    // 2. Filter master list for items NOT in automation
    return masterCases.filter((mc: any) => !automatedCodes.has(mc.caseCode));
  }, [selectedBuild, masterCases]);

  // Only show the gap analysis when looking at "All" tests to avoid confusion
  if (missing.length === 0 || filterStatus !== 'all') return null;

  return (
    <section className="mt-32 pt-20 border-t border-white/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
          <Stethoscope className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Coverage Gap Analysis</h2>
          <p className="text-zinc-500 text-sm font-medium">Requirements from master list not yet detected in this automated build</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {missing.map((mc: any) => (
          <div key={mc.caseCode} className="bg-[#0c0c0e]/50 border border-dashed border-white/10 rounded-[2rem] p-6 hover:border-indigo-500/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black text-zinc-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-colors">
                {mc.caseCode}
              </span>
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[8px] font-black rounded-full uppercase tracking-tighter">
                Manual / Pending
              </span>
            </div>
            
            <h3 className="text-sm font-bold text-zinc-400 group-hover:text-zinc-100 transition-colors line-clamp-2 leading-relaxed">
              {mc.title}
            </h3>
            
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-3 h-3 text-zinc-700" />
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{mc.moduleName}</span>
              </div>
              <span className="text-[8px] font-black text-zinc-800 uppercase tracking-tighter">{mc.priority} priority</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}