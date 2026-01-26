'use client';
import React, { useState } from "react";
import { Database, Shield, Loader2, ChevronRight, X } from "lucide-react"; 
import { createProject } from "@/lib/actions";

export function RegisterProjectModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'cypress',
    environment: 'production',
    description: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProject(formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Registry error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. BACKDROP: Centers the modal and provides the dark overlay
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-mono selection:bg-indigo-500/30">
      
      {/* 2. MODAL CONTAINER: Fixed max-width prevents stretching */}
      <div className="w-40 bg-[#111114] border border-zinc-800 rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Database size={16} className="text-indigo-500" />
            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Resource_Registration_Protocol</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-6">
            
            {/* Project Name Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Instance Name</label>
              <input 
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#09090b] border border-zinc-800 p-3 text-sm text-white outline-none focus:border-indigo-500 transition-all uppercase placeholder:text-zinc-800"
                placeholder="e.g. CLIPPD_WEB_INSTANCE"
              />
            </div>

            {/* Grid for Type and Env */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Framework</label>
                <div className="relative">
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 p-3 text-sm text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="cypress">CYPRESS_ENGINE</option>
                    <option value="playwright">PLAYWRIGHT_ENGINE</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-zinc-600 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Environment</label>
                <div className="relative">
                  <select 
                    value={formData.environment}
                    onChange={(e) => setFormData({...formData, environment: e.target.value})}
                    className="w-full bg-[#09090b] border border-zinc-800 p-3 text-sm text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="production">PRODUCTION</option>
                    <option value="staging">STAGING_VAL</option>
                    <option value="dev">DEV_GREEN</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-zinc-600 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Notice Box */}
            <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 border-l-2 border-l-indigo-500">
               <div className="flex gap-3">
                 <Shield size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                 <p className="text-[9px] text-zinc-500 leading-relaxed uppercase">
                   Linking requires a generated <span className="text-indigo-400">PROJECT_UUID</span>. Registering will create a unique handshake key for your CI pipeline logs.
                 </p>
               </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="px-8 py-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-end items-center gap-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-200 transition-colors"
            >
              Abort_Operation
            </button>
            <button 
              disabled={loading}
              className="px-8 py-2.5 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm_Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}