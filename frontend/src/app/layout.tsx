// app/layout.tsx
import { type Metadata } from 'next'
import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from './_components/Sidebar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'QA Console | AWS Industrial',
  description: 'Automated QA Management System',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0c0c0e] text-zinc-300`}>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar - only shows when signed in */}
            <SignedIn>
              <Sidebar />
            </SignedIn>

            {/* Main content area */}
            <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden bg-[#0c0c0e]">
              {/* Header - only shows when signed in */}
              <SignedIn>
                <header className="flex justify-end items-center px-6 h-14 border-b border-zinc-800 relative z-20 mt-2">
                  <UserButton afterSignOutUrl="/sign-up" />
                </header>
              </SignedIn>

              {/* Background pattern */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                {children}
              </div>
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  )
}