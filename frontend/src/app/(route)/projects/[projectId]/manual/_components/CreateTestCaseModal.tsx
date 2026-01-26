'use client';
import React, { useState } from "react";
import { X, ListTodo, Shield, Loader2 } from "lucide-react";
import { createTestCase } from "@/lib/actions";

export function CreateTestCaseModal({ projectId, isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectId,
    caseCode: '',
    title: '',
    moduleName: '',
    priority: 'medium',
    steps: '',
    expectedResult: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const res = await createTestCase(formData);
    if (res.success) {
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-mono">
      <div className="w-full max-w-2xl bg-[#111114] border border-zinc-800 rounded-none shadow-2xl animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center text-emerald-500">
          <div className="flex items-center gap-3">
            <ListTodo size={16} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">New_Test_Case_Entry</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Case ID</label>
              <input required value={formData.caseCode} onChange={e => setFormData({...formData, caseCode: e.target.value})} className="w-full bg-[#09090b] border border-zinc-800 p-3 text-xs text-white outline-none focus:border-emerald-500 uppercase" placeholder="TC-101" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Module</label>
              <input value={formData.moduleName} onChange={e => setFormData({...formData, moduleName: e.target.value})} className="w-full bg-[#09090b] border border-zinc-800 p-3 text-xs text-white outline-none focus:border-emerald-500 uppercase" placeholder="AUTH" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Test Title</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#09090b] border border-zinc-800 p-3 text-xs text-white outline-none focus:border-emerald-500 uppercase" placeholder="VALIDATE LOGIN WITH SUPABASE" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Execution Steps</label>
            <textarea value={formData.steps} onChange={e => setFormData({...formData, steps: e.target.value})} className="w-full bg-[#09090b] border border-zinc-800 p-3 text-xs text-white outline-none focus:border-emerald-500 h-24" placeholder="1. Open App..." />
          </div>

          <div className="pt-4 flex justify-end gap-6 items-center">
             <button type="button" onClick={onClose} className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Abort</button>
             <button disabled={loading} className="px-10 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Commit_To_Registry'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}