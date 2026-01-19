'use client';
import React, { useEffect, useState, useMemo, Fragment } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { uploadMasterTestCases, getMasterTestCases, updateTestCase } from "@/lib/actions";
import { 
  Edit3, Save, X, Loader2, CheckCircle2, AlertCircle, 
  Search, Folder, Zap, BookOpen, ChevronDown, Upload, 
  Hash, Type, Beaker, Filter, FileSpreadsheet, FileJson, Server, Command, Trash2
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

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const loadData = async () => {
    const data = await getMasterTestCases();
    setMasterCases(data);
  };

  useEffect(() => { loadData(); }, []);

  const uniqueModules = useMemo(() => ["all", ...new Set(masterCases.map(c => c.moduleName).filter(Boolean))], [masterCases]);

  const filteredCases = useMemo(() => {
    return masterCases.filter(c => 
      c.caseCode.toLowerCase().includes(idFilter.toLowerCase()) &&
      c.title.toLowerCase().includes(titleFilter.toLowerCase()) &&
      (moduleFilter === "all" || c.moduleName === moduleFilter)
    );
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
          setStatus({ type: 'success', msg: `Imported ${rawData.length} objects to TiDB registry.` });
          loadData();
        } else throw new Error(res.error);
      } catch (err: any) {
        setStatus({ type: 'error', msg: err.message || "Parse violation" });
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
      setStatus({ type: 'success', msg: "Update committed to TiDB." });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-8 bg-[#0c0c0e] h-full overflow-y-auto custom-scrollbar font-sans">
      {/* AWS STYLE HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
             <Server size={12} />
             <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Quality / Registry / Master Library</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Beaker size={28} className="text-indigo-500" />
            Requirement Manager
          </h1>
        </div>

        <div className="flex items-center gap-3">
            <div className="bg-[#111114] border border-zinc-800 rounded-sm p-3 flex items-center gap-4 shadow-sm">
                <div className="flex -space-x-1">
                    <FileJson size={14} className="text-amber-500/50" />
                    <FileSpreadsheet size={14} className="text-emerald-500/50" />
                </div>
                <label className="cursor-pointer group">
                    <span className="text-[10px] font-black text-white uppercase group-hover:text-indigo-400 transition-colors flex items-center gap-2 tracking-widest">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Sync Metadata
                    </span>
                    <input type="file" className="hidden" accept=".json, .csv, .xlsx, .xls" onChange={handleImport} disabled={loading} />
                </label>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-sm text-center min-w-[100px]">
                <span className="block text-lg font-bold text-white font-mono leading-none">{masterCases.length}</span>
                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter">Total Registry</span>
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

      {/* AWS STYLE FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111114] border border-zinc-800 rounded-sm flex items-center px-4 gap-3 focus-within:border-zinc-600 transition-colors group">
          <Hash size={14} className="text-zinc-600 group-focus-within:text-indigo-500" />
          <input placeholder="FILTER_BY_CODE..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-zinc-200" value={idFilter} onChange={e => setIdFilter(e.target.value)} />
        </div>
        <div className="bg-[#111114] border border-zinc-800 rounded-sm flex items-center px-4 gap-3 focus-within:border-zinc-600 transition-colors group">
          <Type size={14} className="text-zinc-600 group-focus-within:text-indigo-500" />
          <input placeholder="FILTER_BY_TITLE..." className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-mono text-zinc-200 uppercase" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} />
        </div>
        <div className="bg-[#111114] border border-zinc-800 rounded-sm flex items-center px-4 gap-3 focus-within:border-zinc-600 transition-colors group">
          <Filter size={14} className="text-zinc-600 group-focus-within:text-indigo-500" />
          <select className="bg-transparent border-none focus:ring-0 w-full py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
             <option value="all" className="bg-[#0c0c0e]">All Modules</option>
             {uniqueModules.filter(m => m !== 'all').map(m => <option key={m} value={m} className="bg-[#0c0c0e]">{m}</option>)}
          </select>
        </div>
      </div>

      {/* TABLE SECTION - MODULAR PANEL */}
      <div className="bg-[#111114] border border-zinc-800 rounded-sm shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
            <Command size={14} className="text-zinc-500" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Registry Explorer</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] border-b border-zinc-800">
                    <tr>
                        <th className="px-6 py-4">ID_CODE</th>
                        <th className="px-6 py-4">MODULE_PATH</th>
                        <th className="px-6 py-4">DESCRIPTION_OBJECT</th>
                        <th className="px-6 py-4">EXEC_MODE</th>
                        <th className="px-6 py-4 text-center">SEVERITY</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {filteredCases.map((tc) => (
                        <Fragment key={tc.id}>
                            <tr 
                                onClick={() => editingId !== tc.id && setExpandedId(expandedId === tc.id ? null : tc.id)} 
                                className={cn(
                                    "hover:bg-white/[0.02] cursor-pointer transition-colors group",
                                    expandedId === tc.id && "bg-white/[0.01]"
                                )}
                            >
                                <td className="px-6 py-4 font-mono font-bold text-indigo-400 text-[11px]">{tc.caseCode}</td>
                                <td className="px-6 py-4 text-[10px] font-black text-zinc-600 uppercase italic tracking-tighter">{tc.moduleName}</td>
                                <td className="px-6 py-4 text-xs text-zinc-300 font-medium">{tc.title}</td>
                                <td className="px-6 py-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{tc.mode}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-sm border",
                                        tc.priority === 'critical' || tc.priority === 'high' 
                                            ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
                                            : 'text-zinc-600 border-zinc-800'
                                    )}>
                                        {tc.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <ChevronDown size={14} className={cn("text-zinc-700 transition-transform duration-300", expandedId === tc.id && "rotate-180 text-indigo-500")} />
                                </td>
                            </tr>
                            
                            {/* EXPANDABLE AWS DETAIL PANEL */}
                            {expandedId === tc.id && (
                                <tr className="bg-zinc-950/40 border-l-2 border-l-indigo-500">
                                    <td colSpan={6} className="px-10 py-12">
                                        <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                                <h3 className="text-xs font-black text-white uppercase tracking-widest">Requirement_Schema_v1.0</h3>
                                            </div>
                                            {editingId === tc.id ? (
                                                <div className="flex gap-2">
                                                    <button onClick={handleSave} className="bg-emerald-600 px-4 py-2 text-white rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500"><Save size={12} /> Commit</button>
                                                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-sm text-[10px] font-bold uppercase tracking-widest">Abort</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setEditingId(tc.id); setEditForm({...tc}); }} className="bg-zinc-900 border border-zinc-800 px-4 py-2 text-zinc-300 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:border-indigo-500/50 transition-all">
                                                    <Edit3 size={12} /> Modify_Object
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                                                    <Command size={10} /> Instruction_Set
                                                </label>
                                                {editingId === tc.id ? 
                                                    <textarea className="w-full bg-black border border-zinc-800 rounded-sm p-4 text-[11px] font-mono h-48 focus:border-indigo-500 outline-none text-zinc-300" value={editForm.steps} onChange={e => setEditForm({...editForm, steps: e.target.value})} /> 
                                                    : <div className="text-[11px] text-zinc-400 font-mono whitespace-pre-wrap bg-zinc-900/50 border border-zinc-800 p-6 rounded-sm leading-relaxed">{tc.steps || "DATA_NULL"}</div>
                                                }
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                                                    <Zap size={10} /> Validation_Expectation
                                                </label>
                                                {editingId === tc.id ? 
                                                    <textarea className="w-full bg-black border border-zinc-800 rounded-sm p-4 text-[11px] font-mono h-48 focus:border-indigo-500 outline-none text-zinc-300" value={editForm.expectedResult} onChange={e => setEditForm({...editForm, expectedResult: e.target.value})} /> 
                                                    : <div className="text-[11px] text-emerald-400/80 font-mono italic bg-emerald-500/[0.02] border border-emerald-500/10 p-6 rounded-sm leading-relaxed">{tc.expectedResult || "DATA_NULL"}</div>
                                                }
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
      </div>
    </div>
  );
}