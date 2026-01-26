'use client';
import React, { useState, useRef } from "react";
import { X, FileUp, Database, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { importTestCases } from "@/lib/actions";

export function ImportTestCasesModal({ projectId, isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let data: any[] = [];

        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(content);
        } else {
          throw new Error("Unsupported file format. Use .csv or .json");
        }

        const res = await importTestCases(Number(projectId), data);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || "Import failed");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Simple CSV to JSON parser
  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj: any, header, i) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-mono">
      <div className="w-74 max-w-lg bg-[#111114] border border-zinc-800 rounded-none shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileUp size={16} className="text-emerald-500" />
            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Bulk_Import_Protocol</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 bg-[#09090b] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
              <Database size={24} className="text-zinc-600 group-hover:text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">Select_Data_Package</p>
              <p className="text-[9px] text-zinc-600 mt-1">SUPPORTED: .CSV, .JSON</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.json" />
          </div>

          {/* Template Info */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 space-y-3">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} /> Required_Header_Mapping
            </p>
            <div className="flex flex-wrap gap-2">
              {['caseCode', 'title', 'moduleName', 'priority', 'steps'].map(h => (
                <code key={h} className="text-[9px] bg-black px-1.5 py-0.5 border border-zinc-700 text-emerald-500">{h}</code>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-emerald-500 animate-pulse">
               <Loader2 size={14} className="animate-spin" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Parsing_Artifacts...</span>
            </div>
          )}

          {error && (
            <div className="text-rose-500 text-[10px] font-bold uppercase p-3 bg-rose-500/5 border border-rose-500/20">
              Error: {error}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end">
           <button onClick={onClose} className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white">
             Abort_Import
           </button>
        </div>
      </div>
    </div>
  );
}