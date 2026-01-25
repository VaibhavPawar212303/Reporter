// app/layout.tsx
import "./globals.css"; // Ensure your Tailwind styles are imported
import Sidebar from "./_components/Sidebar";

export const metadata = {
  title: "QA Console | AWS Industrial",
  description: "Automated QA Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0c0c0e] text-zinc-300 antialiased">
        <div className="flex h-screen overflow-hidden">
          {/* Static Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
            {/* AWS Grid Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />
            
            {/* Scrollable Viewport */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}