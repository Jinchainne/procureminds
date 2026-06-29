import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProcureMinds AI Pro",
  description: "AI procurement committee powered by GenLayer Intelligent Contracts"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
