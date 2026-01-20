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
  Box, FileJson, FileSpreadsheet, Target, RefreshCw
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
    const automationRate = total > 0 ? Math.round((automated / total) * 100) : 0;
    
    return { total, automated, manual, pending, automationRate };
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
        acc[module] = { items: [], auto: 0, manual: 0 };
      }
      acc[module].items.push(tc);
      const mode = tc.mode?.toLowerCase();
      if (mode === 'automation') acc[module].auto++;
      else if (mode === 'manual') acc[module].manual++;
      return acc;
    }, {});
  }, [masterCases, idFilter, titleFilter, moduleFilter]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: null, msg: "" });

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = async (evt) => {
      try {
        let rawData: any[] = [];
        if (fileName.endsWith('.json')) rawData = JSON.parse(evt.target?.result as string);
        else if (fileName.endsWith('.csv')) {
          const csv = Papa.parse(evt.target?.result as string, { header: true, skipEmptyLines: true });
          rawData = csv.data;
        } 
        else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }
        if (!Array.isArray(rawData)) rawData = [rawData];
        const res = await uploadMasterTestCases(rawData);
        if (res.success) {
          setStatus({ type: 'success', msg: `Sync Complete: ${rawData.length} objects indexed.` });
          loadData();
        } else throw new Error(res.error);
      } catch (err: any) {
        setStatus({ type: 'error', msg: "Input Buffer Violation: Check format." });
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) reader.readAsBinaryString(file);
    else reader.readAsText(file);
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

  const toggleModule = (module: string) => {
    setExpandedModules(prev => 
      prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
    );
  };

  const startEditing = (e: React.MouseEvent, tc: any) => {
    e.stopPropagation();
    setEditingId(tc.id);
    setEditForm({ ...tc });
    setExpandedId(tc.id);
  };

  const renderIndexedContent = (text: string, colorClass: string) => {
    if (!text) return <span className="opacity-30 tracking-widest">DATA_NULL</span>;
    return text.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
      <div key={idx} className="flex gap-3 mb-1.5 group/line">
        <span className={cn("shrink-0 font-mono text-[9px] mt-0.5 opacity-40", colorClass)}>
          [{String(idx + 1).padStart(2, '0')}]
        </span>
        <span className="leading-relaxed">{line}</span>
      </div>
    ));
  };

  return (
    <div className="p-8 space-y-8 bg-[#0c0c0e] h-full overflow-y-auto custom-scrollbar font-sans text-zinc-300">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-2 font-mono text-[10px] uppercase tracking-widest">
             <Server size={12} /> Registry / Infrastructure / Explorer
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 uppercase">
            <Database size={28} className="text-indigo-500" />
            Requirement Registry
          </h1>
        </div>

        <div className="flex items-center gap-3">
            {/* 🔥 UPDATED IMPORT BOX WITH LOADING STATE */}
            <div className={cn(
              "bg-[#111114] border border-zinc-800 rounded-sm p-3 flex items-center gap-4 shadow-sm transition-all",
              loading ? "opacity-70 cursor-not-allowed" : "hover:bg-zinc-900"
            )}>
                <div className="flex -space-x-1">
                    {loading ? (
                      <RefreshCw size={14} className="text-indigo-500 animate-spin" />
                    ) : (
                      <>
                        <FileJson size={14} className="text-amber-500/50" />
                        <FileSpreadsheet size={14} className="text-emerald-500/50" />
                      </>
                    )}
                </div>
                <label className={cn("flex flex-col", loading ? "cursor-not-allowed" : "cursor-pointer group")}>
                    <span className={cn(
                      "text-[10px] font-black uppercase transition-colors flex items-center gap-2 tracking-widest",
                      loading ? "text-indigo-400" : "text-white group-hover:text-indigo-400"
                    )}>
                        {loading ? "UPLOADING_METADATA..." : "Sync_Metadata"}
                        {!loading && <Upload size={12} />}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-mono uppercase">
                      {loading ? "COMMITTING_TO_TIDB" : "JSON_CSV_XLSX"}
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".json, .csv, .xlsx, .xls" 
                      onChange={handleImport} 
                      disabled={loading} 
                    />
                </label>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-sm text-center min-w-[100px]">
                <span className="block text-lg font-bold text-white font-mono leading-none">{masterCases.length}</span>
                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter">Total_Registry</span>
            </div>
        </div>
      </header>

      {/* FEEDBACK ALERT */}
      {status.type && (
        <div className={cn(
            "px-4 py-3 rounded-sm border-l-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-1",
            status.type === 'success' ? "bg-emerald-500/5 border-l-emerald-500 border-zinc-800 text-emerald-500" : "bg-rose-500/5 border-l-rose-500 border-zinc-800 text-rose-500"
        )}>
            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-xs font-bold font-mono tracking-tight uppercase">{status.msg}</span>
            <button onClick={() => setStatus({type: null, msg: ""})} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Automation ROI" value={`${metrics.automationRate}%`} sub="Global Percentage" icon={<Target size={18}/>} color="emerald" />
        <StatCard title="Bot Ready" value={metrics.automated} sub="Automated Scripting" icon={<PlayCircle size={18}/>} color="indigo" />
        <StatCard title="Manual Verification" value={metrics.manual} sub="Human Execution" icon={<MousePointerClick size={18}/>} color="amber" />
        <StatCard title="Awaiting Data" value={metrics.pending} sub="Null Logic" icon={<Hourglass size={18}/>} color="zinc" />
      </div>

      {/* SEARCH FILTERS */}
      <div className="bg-[#111114] border border-zinc-800 p-4 rounded-sm grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
        <div className="flex items-center px-4 gap-3 bg-zinc-950 border border-zinc-800 rounded-sm focus-within:border-zinc-600 transition-colors">
          <Hash size={14} className="text-zinc-600" />
          <input placeholder="ID_SEARCH..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-zinc-200 uppercase" value={idFilter} onChange={e => setIdFilter(e.target.value)} />
        </div>
        <div className="flex items-center px-4 gap-3 bg-zinc-950 border border-zinc-800 rounded-sm focus-within:border-zinc-600 transition-colors">
          <Type size={14} className="text-zinc-600" />
          <input placeholder="TITLE_STRING_MATCH..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-zinc-200 uppercase" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} />
        </div>
        <div className="flex items-center px-4 gap-3 bg-zinc-950 border border-zinc-800 rounded-sm">
          <Filter size={14} className="text-zinc-600" />
          <select className="bg-transparent border-none focus:ring-0 w-full py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
             {uniqueModules.map((m: string) => <option key={m} value={m} className="bg-[#0c0c0e]">{m === 'all' ? 'ALL_MODULES' : m.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* FOLDER STRUCTURE EXPLORER */}
      <div className="space-y-4 pb-20">
        {Object.entries(groupedCases).map(([moduleName, group]: [string, any]) => (
          <div key={moduleName} className="bg-[#111114] border border-zinc-800 rounded-sm overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleModule(moduleName)}
              className={cn(
                "px-6 py-4 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group hover:bg-zinc-900 transition-colors border-l-2",
                expandedModules.includes(moduleName) ? "border-l-indigo-500" : "border-l-transparent"
              )}
            >
              <div className="flex items-center gap-4">
                {expandedModules.includes(moduleName) ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-zinc-600" />}
                <Folder size={18} className={cn("transition-colors", expandedModules.includes(moduleName) ? "text-indigo-500 fill-indigo-500/10" : "text-zinc-600")} />
                <span className="text-xs font-black text-zinc-200 uppercase tracking-widest">{moduleName}</span>
              </div>
              
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                 <div className="flex items-center bg-black/40 border border-zinc-800 rounded-sm px-3 py-1.5 gap-4 font-mono">
                    <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
                        <span className="text-[7px] text-zinc-600 uppercase font-black tracking-tighter">Automated</span>
                        <span className="text-[11px] font-bold text-emerald-500">{group.auto}</span>
                    </div>
                    <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
                        <span className="text-[7px] text-zinc-600 uppercase font-black tracking-tighter">Manual</span>
                        <span className="text-[11px] font-bold text-indigo-400">{group.manual}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[7px] text-zinc-600 uppercase font-black tracking-tighter">Total</span>
                        <span className="text-[11px] font-bold text-zinc-400">{group.items.length}</span>
                    </div>
                 </div>
                 <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-sm">
                    <span className="text-[11px] font-black text-zinc-200 font-mono">
                        {group.items.length > 0 ? Math.round((group.auto / group.items.length) * 100) : 0}%
                    </span>
                 </div>
              </div>
            </div>

            {expandedModules.includes(moduleName) && (
              <div className="overflow-x-auto border-t border-zinc-800 animate-in fade-in slide-in-from-top-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black/20 text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">ID_CODE</th>
                      <th className="px-6 py-4">TITLE_STRING</th>
                      <th className="px-6 py-4">EXEC_MODE</th>
                      <th className="px-6 py-4 text-center">SEVERITY</th>
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
                                <input className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-indigo-400 w-24 outline-none font-mono" value={editForm.caseCode} onClick={e => e.stopPropagation()} onChange={e => setEditForm({...editForm, caseCode: e.target.value})} />
                            ) : ( <span className="text-indigo-400 font-bold">{tc.caseCode}</span> )}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {editingId === tc.id ? (
                                <input className="bg-zinc-950 border border-zinc-700 rounded-sm px-3 py-1 text-zinc-200 w-full outline-none font-sans" value={editForm.title} onClick={e => e.stopPropagation()} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                            ) : ( <span className="text-zinc-300 font-bold uppercase tracking-tight">{tc.title}</span> )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === tc.id ? (
                                <select className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-[10px] font-black uppercase outline-none" value={editForm.mode} onClick={e => e.stopPropagation()} onChange={e => setEditForm({...editForm, mode: e.target.value})}>
                                    <option value="Automation">Automation</option>
                                    <option value="Manual">Manual</option>
                                </select>
                            ) : ( <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{tc.mode}</span> )}
                          </td>
                          <td className="px-6 py-4 text-center">
                             {editingId === tc.id ? (
                                <select className="bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1 text-[10px] font-black uppercase outline-none" value={editForm.priority} onClick={e => e.stopPropagation()} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                             ) : (
                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border rounded-sm", tc.priority === 'critical' ? 'border-rose-500/30 text-rose-500 bg-rose-500/5' : 'border-zinc-800 text-zinc-600 tracking-tighter')}>{tc.priority}</span>
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
                                        <textarea className="w-full bg-black border border-zinc-800 p-4 font-mono text-[11px] h-48 outline-none text-zinc-400 focus:border-indigo-500 rounded-sm" value={editForm.steps} onChange={e => setEditForm({...editForm, steps: e.target.value})} />
                                     ) : (
                                        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-[11px] font-mono text-zinc-400 leading-relaxed min-h-[12rem]">
                                          {renderIndexedContent(tc.steps, "text-indigo-500")}
                                        </div>
                                     )}
                                  </div>
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Zap size={10}/> Expected_Result</p>
                                     {editingId === tc.id ? (
                                        <textarea className="w-full bg-black border border-zinc-800 p-4 font-mono text-[11px] h-48 outline-none text-zinc-400 focus:border-indigo-500 rounded-sm" value={editForm.expectedResult} onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} />
                                     ) : (
                                        <div className="p-5 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-sm text-[11px] font-mono text-emerald-400/70 leading-relaxed min-h-[12rem]">
                                          {renderIndexedContent(tc.expectedResult, "text-emerald-500")}
                                        </div>
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
      <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase tracking-tighter">{sub}</p>
    </div>
  );
}