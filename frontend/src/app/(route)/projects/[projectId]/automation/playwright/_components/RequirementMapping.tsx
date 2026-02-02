// src/app/(route)/playwright/dashboard/_components/RequirementMapping.tsx
import React from "react";
import { BookOpenCheck, ClipboardCheck, Target, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export function RequirementMapping({ masterData }: { masterData: any[] }) {
  if (!masterData || masterData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors duration-300">
      {masterData.map((req: any) => (
        <div 
          key={req.caseCode} 
          className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm"
        >
          {/* Header & Priority Badge */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                Manual Requirement
              </span>
            </div>
            <span className="px-2 py-0.5 bg-muted/10 border border-border rounded text-[8px] font-black text-muted uppercase">
              {req.priority}
            </span>
          </div>

          <div>
            {/* Title */}
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Hash className="w-3 h-3 text-muted opacity-50" /> 
              {req.caseCode}: {req.title}
            </h4>

            <div className="space-y-4">
              {/* Manual Steps Box */}
              <div className="space-y-2">
                <span className="flex items-center gap-2 text-[9px] font-black text-muted uppercase">
                  <ClipboardCheck className="w-3 h-3" /> Manual Steps
                </span>
                <div className="text-[11px] text-muted leading-relaxed bg-background p-3 rounded-xl border border-border whitespace-pre-wrap">
                  {req.steps}
                </div>
              </div>

              {/* Expected Outcome Box */}
              <div className="space-y-2">
                <span className="flex items-center gap-2 text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase">
                  <Target className="w-3 h-3" /> Expected Outcome
                </span>
                <div className="text-[11px] text-muted bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  {req.expectedResult}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}