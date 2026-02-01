import { Fragment } from "react";
import { Edit3, Save, X, Trash2, ChevronDown, Command, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function TestCaseRow({ tc, expandedId, setExpandedId, editingId, setEditingId, editForm, setEditForm, onSave, onCancel, onDelete, renderIndexedContent }: any) {
  const isEditing = editingId === tc.id;
  const isExpanded = expandedId === tc.id;

  return (
    <Fragment>
      <div onClick={() => !isEditing && setExpandedId(isExpanded ? null : tc.id)} 
        className={cn("p-4 hover:bg-muted/5 cursor-pointer flex items-center justify-between group/row border-b border-border last:border-0", isEditing && "bg-indigo-500/5")}>
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="w-24 shrink-0">
            {isEditing ? (
              <input className="bg-background border border-border p-1 text-[10px] w-full font-mono text-indigo-500" value={editForm.caseCode} onClick={e => e.stopPropagation()} onChange={e => setEditForm({ ...editForm, caseCode: e.target.value })} />
            ) : <span className="text-[10px] font-mono text-indigo-600 font-bold">{tc.caseCode}</span>}
          </div>
          <div className="flex-1 truncate">
            {isEditing ? (
              <input className="bg-background border border-border p-1 text-xs w-full text-foreground" value={editForm.title} onClick={e => e.stopPropagation()} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            ) : <span className="text-[11px] font-bold text-foreground uppercase truncate">{tc.title}</span>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[9px] font-black text-muted uppercase tracking-widest">{tc.mode}</span>
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-1.5 bg-emerald-600 text-white rounded-sm hover:bg-emerald-500"><Save size={12}/></button>
                <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="p-1.5 bg-muted text-foreground rounded-sm"><X size={12}/></button>
              </>
            ) : (
              <>
                <button onClick={(e) => { e.stopPropagation(); setEditingId(tc.id); setEditForm({...tc}); setExpandedId(tc.id); }} className="p-1.5 text-muted hover:text-indigo-500 opacity-0 group-hover/row:opacity-100 transition-all"><Edit3 size={14}/></button>
                <button onClick={(e) => onDelete(e, tc.id)} className="p-1.5 text-muted hover:text-rose-500 opacity-0 group-hover/row:opacity-100 transition-all"><Trash2 size={14}/></button>
                <ChevronDown size={14} className={cn("text-muted transition-transform", isExpanded && "rotate-180 text-indigo-500")} />
              </>
            )}
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-10 bg-card border-l-2 border-indigo-500/50 grid grid-cols-2 gap-10 border-y border-border">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2"><Command size={10} /> Instructions</p>
            {isEditing ? <textarea className="w-full bg-background border border-border p-4 font-mono text-[11px] h-48 text-foreground" value={editForm.steps} onChange={e => setEditForm({ ...editForm, steps: e.target.value })} /> : <div className="p-5 bg-background border border-border min-h-[12rem]">{renderIndexedContent(tc.steps, "text-indigo-500")}</div>}
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2"><Zap size={10} /> Expected_Outcome</p>
            {isEditing ? <textarea className="w-full bg-background border border-border p-4 font-mono text-[11px] h-48 text-foreground" value={editForm.expectedResult} onChange={e => setEditForm({ ...editForm, expectedResult: e.target.value })} /> : <div className="p-5 bg-background border border-border min-h-[12rem]">{renderIndexedContent(tc.expectedResult, "text-emerald-500")}</div>}
          </div>
        </div>
      )}
    </Fragment>
  );
}