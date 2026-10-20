import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portfolio Immortalized | Secure Digital Legacy Platform',
  description: 'Your story. Your legacy. Protected for tomorrow. A secure digital vault for important documents, family memories, and controlled release instructions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
