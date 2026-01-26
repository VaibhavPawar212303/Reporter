"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Cpu, PlayCircle, Database, Command, Projector, FilePlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-64 bg-[#0b0b0d] border-r border-zinc-800 flex flex-col shrink-0 z-50">
      <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-800 bg-zinc-900/20">
        <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)] font-mono">
          <Command className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:block">
          <h1 className="font-bold text-white tracking-tight text-sm uppercase">QA_Console</h1>
          <p className="text-[8px] font-mono text-zinc-500 uppercase leading-none">v4.0.2-stable</p>
        </div>
      </div>

      <nav className="p-5 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Executive Overview" active={pathname === "/dashboard"} />
        <NavItem href="/projects" icon={<FilePlusIcon />} label="Project" active={pathname.startsWith("/project")} />
        {/* <NavItem href="/playwright" icon={<Cpu />} label="Playwright Instance" active={pathname.startsWith("/playwright")} /> */}
        {/* <NavItem href="/cypress" icon={<PlayCircle />} label="Cypress Instance" active={pathname.startsWith("/cypress")} /> */}
        {/* <NavItem href="/test-cases" icon={<Database />} label="TestCase Manager" active={pathname === "/test-cases"} /> */}
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, href, active }: any) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 w-full transition-all duration-200 border-l-2 relative group rounded-none",
        active ? "bg-zinc-800 border-l-indigo-500 text-white" : "border-l-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
      )}
    >
      <div className={cn("transition-colors shrink-0", active ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400")}>
        {React.cloneElement(icon, { size: 16 })}
      </div>
      <span className={cn("hidden lg:block text-xs font-bold tracking-tight", active ? "text-white" : "text-inherit")}>
        {label}
      </span>
    </Link>
  );
}