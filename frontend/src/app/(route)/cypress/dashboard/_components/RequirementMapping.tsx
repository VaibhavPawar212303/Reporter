import { BookOpenCheck, ClipboardCheck, Hash, Target } from "lucide-react";

export function RequirementMapping({ masterData }: { masterData: any[] }) {
  if (masterData.length === 0) return (
    <div className="p-6 bg-red-500/5 border border-dashed border-red-500/10 rounded-3xl text-center">
      <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest">No matching requirement found in Master Library.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {masterData.map((req: any) => (
        <div key={req.caseCode} className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Requirement Detail</span>
            </div>
            <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] font-black text-zinc-500 uppercase">{req.priority}</span>
          </div>
          <h4 className="text-xs font-black text-zinc-300 uppercase flex items-center gap-2">
            <Hash className="w-3 h-3 text-zinc-600" /> {req.caseCode}: {req.title}
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-[9px] font-black text-zinc-600 uppercase"><ClipboardCheck className="w-3 h-3" /> Manual Steps</span>
              <div className="text-[11px] text-zinc-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5 whitespace-pre-wrap">{req.steps}</div>
            </div>
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-[9px] font-black text-green-600 uppercase"><Target className="w-3 h-3" /> Expected Outcome</span>
              <div className="text-[11px] text-zinc-400 italic bg-green-500/[0.02] p-3 rounded-xl border border-green-500/5">{req.expectedResult}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}