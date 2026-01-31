import { type Metadata } from 'next'
import { ClerkProvider, SignedIn, UserButton } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from './_components/Sidebar'

import ThemeToggle from './_components/ThemeToggle'
import { ThemeProvider } from 'next-themes'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QA Console | AWS Industrial',
  description: 'Automated QA Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
          {/* Add attribute="class" here 🟢 */}
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className="flex h-screen overflow-hidden">
              <SignedIn>
                <Sidebar />
              </SignedIn>

              <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden bg-background mt-2">
                <SignedIn>
                  <header className="flex justify-end items-center px-6 h-14 border-b border-border relative z-20">
                    <ThemeToggle />
                    <UserButton afterSignOutUrl="/sign-up" />
                  </header>
                </SignedIn>

                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />

                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                  {children}
                </div>
              </main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}