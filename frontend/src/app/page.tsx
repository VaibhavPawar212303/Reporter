"use client";

import React, { useState } from "react";
import { 
  Bot, TestTube, FileCode, Bug, Settings, MessageSquare, 
  PenTool, PlayCircle, Book, LayoutDashboard, Server, 
  Command, Cpu, Terminal, Database, ListTodo 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Components ---
import ArchitectView from "@/app/_components/ArchitectView";
import ChatView from "@/app/_components/ChatView";
import CreateTestCase from "./(route)/testcases/page";
import CypressDashboard from "@/app/(route)/cypress/dashboard/page";
import TestCaseManager from "./(route)/test-cases/page";
import PlaywrightDashboard from "./(route)/playwright/dashboard/page";
import Overview from "./_components/Overview";
// import BugTracker from "./(route)/clickup/page";

type ViewState = "overview" | "chat" | "architect" | "testcases" | "cypress" | "playwright" | "test-cases";

export default function Home() {
  const [activeView, setActiveView] = useState<ViewState>("test-cases");

  return (
    <div className="flex h-screen bg-[#0c0c0e] text-zinc-300 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION - AWS INDUSTRIAL STYLE */}
      <aside className="w-16 lg:w-64 bg-[#0b0b0d] border-r border-zinc-800 flex flex-col shrink-0 z-50">
        
        {/* Branding Area */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-800 bg-zinc-900/20">
          <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <Command className="w-5 h-5 text-white" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="font-bold text-white tracking-tight text-sm uppercase">QA_Console</h1>
            <p className="text-[8px] font-mono text-zinc-500 uppercase leading-none">v4.0.2-stable</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-5 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          
          <div className="px-3 py-4">
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] font-mono">Infrastructure</span>
          </div>

          <NavItem 
            icon={<LayoutDashboard />} 
            label="Executive Overview" 
            active={activeView === "overview"} 
            onClick={() => setActiveView("overview")} 
          />
          <NavItem 
            icon={<Cpu />} 
            label="Playwright Instance" 
            active={activeView === "playwright"} 
            onClick={() => setActiveView("playwright")} 
          />
          <NavItem 
            icon={<PlayCircle />} 
            label="Cypress Instance" 
            active={activeView === "cypress"} 
            onClick={() => setActiveView("cypress")} 
          />
          
          <div className="px-3 py-4 mt-4 border-t border-zinc-800/50">
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] font-mono">Registry</span>
          </div>

          <NavItem 
            icon={<Database />} 
            label="TestCase Manager" 
            active={activeView === "test-cases"} 
            onClick={() => setActiveView("test-cases")} 
          />
          
          {/* UPDATED: Using Bug icon for the NavItem and correctly setting the view */}
          {/* <NavItem 
            icon={<Bug />} 
            label="Clickup Tasks" 
            active={activeView === "clickuptasks"} 
            onClick={() => setActiveView("clickuptasks")} 
          /> */}

        </nav>

        {/* Footer Area */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/10">
          {/* Footer content if any */}
        </div>
      </aside>

      {/* MAIN VIEW AREA - CONSOLE FRAME */}
      <main className="flex-1 min-w-0 bg-[#0c0c0e] flex flex-col relative overflow-hidden">
        {/* Dynamic Background Pattern (Subtle AWS grid) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          {activeView === "overview" && <Overview />}
          {activeView === "chat" && <ChatView />}
          {activeView === "architect" && <ArchitectView socket={null} />}
          {activeView === "testcases" && <CreateTestCase />}
          {activeView === "test-cases" && <TestCaseManager />} 
          {activeView === "cypress" && <CypressDashboard />}
          {activeView === "playwright" && <PlaywrightDashboard />}
          
          {/* UPDATED: Added rendering for the ClickUp BugTracker view */}
          {/* {activeView === "clickuptasks" && <BugTracker />} */}
        </div>
      </main>
    </div>
  );
}

/**
 * NavItem: AWS Styled sidebar button
 */
function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 w-full transition-all duration-200 border-l-2 relative overflow-hidden group rounded-sm",
        active 
          ? "bg-zinc-800 border-l-indigo-500 text-white" 
          : "border-l-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "transition-colors shrink-0",
        active ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
      )}>
        {React.cloneElement(icon, { size: 16 })}
      </div>

      {/* Label */}
      <span className={cn(
        "hidden lg:block text-xs font-bold tracking-tight whitespace-nowrap",
        active ? "text-white" : "text-inherit"
      )}>
        {label}
      </span>

      {/* Active Indicator Glow */}
      {active && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
      )}
    </button>
  );
}