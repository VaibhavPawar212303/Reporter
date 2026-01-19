'use client';
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { uploadMasterTestCases, getMasterTestCases, updateTestCase } from "@/lib/actions";
import { 
  Edit3, Save, X, Loader2, CheckCircle2, AlertCircle, 
  Folder, Zap, ChevronDown, ChevronRight, Upload, 
  Hash, Type, Filter, Server, Command, 
  MousePointerClick, PlayCircle, Hourglass, Database,
  Box, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestCaseManager() {
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });
  
  const [idFilter, setIdFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const loadData = async () => {
    const data = await getMasterTestCases();
    setMasterCases(data);
  };

  useEffect(() => { loadData(); }, []);

  const uniqueModules = useMemo(() => {
    const modules = masterCases.map((c: any) => c.moduleName).filter(Boolean);
    return ["all", ...Array.from(new Set(modules))];
  }, [masterCases]);

  const metrics = useMemo(() => {
    const total = masterCases.length;
    const automated = masterCases.filter((c: any) => c.mode?.toLowerCase() === 'automation').length;
    const manual = masterCases.filter((c: any) => c.mode?.toLowerCase() === 'manual').length;
    const pending = total - (automated + manual);
    return { total, automated, manual, pending };
  }, [masterCases]);

  const groupedCases = useMemo(() => {
    const filtered = masterCases.filter((c: any) => 
      c.caseCode.toLowerCase().includes(idFilter.toLowerCase()) &&
      c.title.toLowerCase().includes(titleFilter.toLowerCase()) &&
      (moduleFilter === "all" || c.moduleName === moduleFilter)
    );

    return filtered.reduce((acc: any, tc: any) => {
      const module = tc.moduleName || "UNGROUPED";
      if (!acc[module]) {
        acc[module] = { items: [], auto: 0, manual: 0, pending: 0 };
      }
      acc[module].items.push(tc);
      const mode = tc.mode?.toLowerCase();
      if (mode === 'automation') acc[module].auto++;
      else if (mode === 'manual') acc[module].manual++;
      else acc[module].pending++;
      return acc;
    }, {});
  }, [masterCases, idFilter, titleFilter, moduleFilter]);

  const toggleModule = (module: string) => {
    setExpandedModules(prev => 
      prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await updateTestCase(editingId!, editForm);
    if (res.success) {
      setEditingId(null);
      await loadData();
      setStatus({ type: 'success', msg: "Commit Success: Registry updated." });
    } else {
      setStatus({ type: 'error', msg: "Update failed." });
    }
    setLoading(false);
  };

  const startEditing = (e: React.MouseEvent, tc: any) => {
    e.stopPropagation();
    setEditingId(tc.id);
    setEditForm({ ...tc });
    setExpandedId(tc.id); // Expand the row automatically when editing
  };

  return (
    <div className="p-8 space-y-8 bg-[#0c0c0e] h-full overflow-y-auto custom-scrollbar font-sans text-zinc-300">
      {/* HEADER SECTION (Same as before) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-2 font-mono text-[10px] uppercase tracking-widest">
             <Server size={12} /> Registry / Infrastructure / Explorer
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Database size={28} className="text-indigo-500" />
            Requirement Registry
          </h1>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-sm text-center min-w-[100px]">
            <span className="block text-lg font-bold text-white font-mono leading-none">{masterCases.length}</span>
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter">Master_Library_Count</span>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Registry" value={metrics.total} sub="Objects" icon={<Box size={18}/>} color="zinc" />
        <StatCard title="Automated" value={metrics.automated} sub="Bot_Ready" icon={<PlayCircle size={18}/>} color="emerald" />
        <StatCard title="Manual_Ops" value={metrics.manual} sub="Human_Verify" icon={<MousePointerClick size={18}/>} color="indigo" />
        <StatCard title="Backlog" value={metrics.pending} sub="Pending_Logic" icon={<Hourglass size={18}/>} color="amber" />
      </div>

      {/* FOLDER EXPLORER */}
      <div className="space-y-4 pb-20">
        {Object.entries(groupedCases).map(([moduleName, group]: [string, any]) => (
          <div key={moduleName} className="bg-[#111114] border border-zinc-800 rounded-sm overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleModule(moduleName)}
              className={cn(
                "px-6 py-4 bg-zinc-900/50 flex items-center justify-between cursor-pointer group hover:bg-zinc-900 transition-colors border-l-2",
                expandedModules.includes(moduleName) ? "border-l-indigo-500" : "border-l-transparent"
              )}
            >
              <div className="flex items-center gap-4">
                {expandedModules.includes(moduleName) ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-zinc-600" />}
                <Folder size={18} className={cn("transition-colors", expandedModules.includes(moduleName) ? "text-indigo-500 fill-indigo-500/10" : "text-zinc-600")} />
                <span className="text-xs font-black text-zinc-200 uppercase tracking-widest">{moduleName}</span>
              </div>
              
              <div className="flex items-center gap-3 px-4 py-1.5 bg-black/40 rounded-sm border border-zinc-800 font-mono">
                  <span className="text-[10px] text-emerald-500">{group.auto}A</span>
                  <span className="text-[10px] text-indigo-400">{group.manual}M</span>
                  <span className="text-[10px] text-zinc-500">{group.items.length}T</span>
              </div>
            </div>

            {expandedModules.includes(moduleName) && (
              <div className="overflow-x-auto border-t border-zinc-800">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/20 text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">ID_CODE</th>
                      <th className="px-6 py-4">TITLE_STRING</th>
                      <th className="px-6 py-4">EXEC_MODE</th>
                      <th className="px-6 py-4">PRIORITY</th>
                      <th className="px-6 py-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {group.items.map((tc: any) => (
                      <Fragment key={tc.id}>
                        <tr 
                          onClick={() => !editingId && setExpandedId(expandedId === tc.id ? null : tc.id)} 
                          className={cn("hover:bg-white/[0.02] cursor-pointer transition-colors group", editingId === tc.id && "bg-indigo-500/5")}
                        >
                          <td className="px-6 py-4 font-mono text-[11px]">
                            {editingId === tc.id ? (
                                <input 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-indigo-400 w-24 outline-none focus:border-indigo-500" 
                                    value={editForm.caseCode} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, caseCode: e.target.value})} 
                                />
                            ) : (
                                <span className="text-indigo-400 font-bold">{tc.caseCode}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {editingId === tc.id ? (
                                <input 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-1 text-zinc-200 w-full outline-none focus:border-indigo-500" 
                                    value={editForm.title} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, title: e.target.value})} 
                                />
                            ) : (
                                <span className="text-zinc-300">{tc.title}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === tc.id ? (
                                <select 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-[10px] font-bold uppercase outline-none" 
                                    value={editForm.mode} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, mode: e.target.value})}
                                >
                                    <option value="Automation">Automation</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            ) : (
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{tc.mode}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                             {editingId === tc.id ? (
                                <select 
                                    className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-[10px] font-bold uppercase outline-none" 
                                    value={editForm.priority} 
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditForm({...editForm, priority: e.target.value})}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                             ) : (
                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border rounded-sm", tc.priority === 'critical' ? 'border-rose-500/30 text-rose-500 bg-rose-500/5' : 'border-zinc-800 text-zinc-600')}>{tc.priority}</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             {editingId === tc.id ? (
                                <div className="flex justify-end gap-2">
                                    <button onClick={handleSave} className="p-1.5 bg-emerald-600 text-white rounded-sm hover:bg-emerald-500 transition-colors"><Save size={14}/></button>
                                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-sm hover:bg-zinc-700"><X size={14}/></button>
                                </div>
                             ) : (
                                <button onClick={(e) => startEditing(e, tc)} className="p-1.5 text-zinc-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>
                             )}
                          </td>
                        </tr>
                        
                        {/* Expanded Detail Panel */}
                        {expandedId === tc.id && (
                          <tr className="bg-zinc-950/40 border-l-2 border-l-indigo-500">
                             <td colSpan={5} className="px-12 py-10">
                               <div className="grid grid-cols-2 gap-12">
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Command size={10}/> Instruction_Set</p>
                                     {editingId === tc.id ? (
                                        <textarea 
                                            className="w-full bg-black border border-zinc-800 p-4 font-mono text-[11px] h-48 outline-none text-zinc-400 focus:border-indigo-500 rounded-sm" 
                                            value={editForm.steps} 
                                            onChange={e => setEditForm({...editForm, steps: e.target.value})} 
                                        />
                                     ) : (
                                        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed min-h-[12rem]">{tc.steps || "DATA_NULL"}</div>
                                     )}
                                  </div>
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Zap size={10}/> Expected_Result</p>
                                     {editingId === tc.id ? (
                                        <textarea 
                                            className="w-full bg-black border border-zinc-800 p-4 font-mono text-[11px] h-48 outline-none text-zinc-400 focus:border-indigo-500 rounded-sm" 
                                            value={editForm.expectedResult} 
                                            onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} 
                                        />
                                     ) : (
                                        <div className="p-5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-sm text-[11px] font-mono text-emerald-400/70 whitespace-pre-wrap italic leading-relaxed min-h-[12rem]">{tc.expectedResult || "DATA_NULL"}</div>
                                     )}
                                  </div>
                               </div>
                             </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, color }: any) {
  const accents: any = { indigo: 'border-t-indigo-500', emerald: 'border-t-emerald-500', amber: 'border-t-amber-500', zinc: 'border-t-zinc-600' };
  return (
    <div className={cn("bg-[#111114] border border-zinc-800 border-t-2 p-6 shadow-sm rounded-sm group hover:bg-zinc-900/50 transition-all", accents[color])}>
      <div className="flex justify-between items-center mb-4 text-zinc-500">{icon}</div>
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-white tracking-tighter font-mono">{value}</div>
      <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase italic tracking-tighter">{sub}</p>
    </div>
  );
}