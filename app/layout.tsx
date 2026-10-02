import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Othello VS CPU",
  description: "A browser Othello game built with Next.js, React, and TypeScript."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
