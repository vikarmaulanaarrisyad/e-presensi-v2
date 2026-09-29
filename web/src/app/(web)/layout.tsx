import React from "react";
import { Sidebar } from "@/components/organisms/sidebar";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { Footer } from "@/components/organisms/footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  let madrasahName = user?.madrasahName ?? undefined;
  if (!madrasahName && user?.madrasahId) {
    const m = await prisma.madrasah.findUnique({
      where: { id: user.madrasahId },
      select: { name: true },
    });
    madrasahName = m?.name ?? undefined;
  }

  return (
    <div className="min-h-screen flex bg-slate-50/70 dark:bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Sticky Executive Sidebar */}
      <Sidebar
        madrasahName={madrasahName}
        userName={user?.name ?? undefined}
        userRole={user?.role ?? undefined}
      />

      {/* Main Content Column with Header & Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-50/70 dark:bg-background">
        {/* Unified Executive Header */}
        <HeaderNavbar
          madrasahName={madrasahName}
          userName={user?.name ?? undefined}
          userRole={user?.role ?? undefined}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 px-4 sm:px-6 xl:px-8 py-6 w-full flex flex-col gap-6">
          {children}
        </main>

        {/* Unified Official Footer */}
        <Footer />
      </div>
    </div>
  );
}
