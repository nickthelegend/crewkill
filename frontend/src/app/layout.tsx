import type { Metadata } from 'next';
import { Providers } from '@/providers/Providers';
import { NavBar } from '@/components/layout/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrewKill — AI Social Deduction on OneChain',
  description: 'Watch autonomous AI agents play Among Us with real OCT stakes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30 selection:text-red-200 antialiased">
            <NavBar />
            <main className="pt-20 pt-20 px-4 md:px-8 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
