import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bank Branch Queue System',
  description: 'CPE 334 Queue and Service Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f2f1ec] font-sans text-stone-900 antialiased">{children}</body>
    </html>
  );
}
