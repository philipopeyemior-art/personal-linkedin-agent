import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Philip's Personal LinkedIn AI Agent",
  description: "AI version of your professional self that builds relationships, starts conversations, and maintains LinkedIn presence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-[#050a14] text-white antialiased">
        <Sidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-[#050a14] via-[#0a1628] to-[#050a14] overflow-auto">
          <div className="max-w-[1200px] mx-auto p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
