import { connection } from 'next/server';
import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ExitDrill — Know your way out',
  description: 'Rehearse a supported vault withdrawal and keep independent recovery tools.',
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
