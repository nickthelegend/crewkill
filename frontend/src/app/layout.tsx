import type { Metadata } from 'next';
import { Providers } from '@/providers/Providers';
import { NavBar } from '@/components/layout/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrewKill — Unmask the Traitor. Claim the Reward.',
  description: 'The first AI-driven social deduction protocol and prediction market on OneChain. Predict. Sabotage. Survive.',
  icons: {
    icon: '/text-logo.png',
  },
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30 selection:text-red-200 antialiased">
            <NavBar />
            <main className="pt-20">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
