'use client';

import React, { useState } from "react";
import { Upload, RefreshCw } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { importTestCases } from "@/lib/actions";

export function ImportTestCaseTool({
  projectId,
  onRefresh,
}: {
  projectId: number;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [moduleName, setModuleName] = useState("");

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setLoading(true);
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = async (evt) => {
      try {
        let rawData: any[] = [];

        if (fileName.endsWith(".json")) {
          rawData = JSON.parse(evt.target?.result as string);
        } else if (fileName.endsWith(".csv")) {
          const csv = Papa.parse(evt.target?.result as string, {
            header: true,
            skipEmptyLines: true,
          });
          rawData = csv.data as any[];
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          const wb = XLSX.read(evt.target?.result, { type: "binary" });
          rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }

        // ✅ IMPORTANT PART: inject module if user provided it
        if (moduleName.trim()) {
          rawData = rawData.map((row) => ({
            ...row,

            // support ALL backend mappings
            moduleName: moduleName.trim(),
            module_name: moduleName.trim(),
            "Module Name": moduleName.trim(),
            ModuleName: moduleName.trim(),
          }));
        }

        const res = await importTestCases(projectId, rawData);
        if (res?.success) {
          setModuleName("");
          onRefresh();
        }
      } catch (err) {
        console.error("Import failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"))
      reader.readAsBinaryString(file);
    else reader.readAsText(file);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-card border border-border rounded-sm p-3 transition-all",
        loading ? "opacity-50" : "hover:bg-muted/5"
      )}
    >
      {/* MODULE NAME INPUT */}
      <input
        value={moduleName}
        onChange={(e) => setModuleName(e.target.value)}
        placeholder="MODULE / SUBMODULE (optional)"
        className="bg-background border border-border rounded-sm px-3 py-2 text-[11px] font-mono text-foreground outline-none w-56"
      />

      {/* FILE UPLOAD */}
      <label className="cursor-pointer flex items-center gap-2">
        <div className="p-2 bg-background border border-border rounded-sm">
          {loading ? (
            <RefreshCw size={14} className="text-indigo-500 animate-spin" />
          ) : (
            <Upload size={14} className="text-muted-foreground" />
          )}
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
          {loading ? "UPLOADING..." : "Import"}
        </span>

        <input
          type="file"
          className="hidden"
          accept=".json,.csv,.xlsx,.xls"
          onChange={handleImport}
          disabled={loading}
        />
      </label>
    </div>
  );
}
