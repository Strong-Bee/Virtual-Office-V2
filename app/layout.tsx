import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'NexusOS Virtual Office & AI Workforce',
  description:
    'Multiplayer 2D Virtual Office & Enterprise AI Workforce Platform with Human-in-the-Loop Governance, Department Supervisors, Realtime Presence, and Autonomous Agents.',
  openGraph: {
    title: 'NexusOS Virtual Office & AI Workforce',
    description:
      'Multiplayer 2D Virtual Office & Enterprise AI Workforce Platform with Human-in-the-Loop Governance, Department Supervisors, Realtime Presence, and Autonomous Agents.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexusOS Virtual Office & AI Workforce',
    description:
      'Multiplayer 2D Virtual Office & Enterprise AI Workforce Platform with Human-in-the-Loop Governance, Department Supervisors, Realtime Presence, and Autonomous Agents.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="font-sans bg-slate-950 text-slate-100 antialiased"
      >
        {children}
      </body>
    </html>
  );
}

