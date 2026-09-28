import React from "react";
import { Sidebar } from "@/components/organisms/sidebar";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { Footer } from "@/components/organisms/footer";

export default function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-50/70 dark:bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Sticky Executive Sidebar */}
      <Sidebar />

      {/* Main Content Column with Header & Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-50/70 dark:bg-background">
        {/* Unified Executive Header */}
        <HeaderNavbar />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 xl:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {children}
        </main>

        {/* Unified Official Footer */}
        <Footer />
      </div>
    </div>
  );
}
