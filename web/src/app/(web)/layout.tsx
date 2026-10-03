import React from "react";
import { Sidebar } from "@/components/organisms/sidebar";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { Footer } from "@/components/organisms/footer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/login");
  }

  let madrasahName = user?.madrasahName ?? undefined;
  if (!madrasahName && user?.madrasahId) {
    const m = await prisma.madrasah.findUnique({
      where: { id: user.madrasahId },
      select: { name: true },
    });
    madrasahName = m?.name ?? undefined;
  }

  return (
    <div className="min-h-screen flex bg-slate-50/70 dark:bg-background text-foreground antialiased selection:bg-emerald-500/20 selection:text-emerald-900 print:min-h-0 print:bg-white">
      {/* Sticky Executive Sidebar */}
      <div className="print:hidden">
        <Sidebar
          madrasahName={madrasahName}
          userName={user?.name ?? undefined}
          userEmail={user?.email ?? undefined}
          userRole={user?.role ?? undefined}
        />
      </div>

      {/* Main Content Column with Header & Footer */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-50/70 dark:bg-background print:min-h-0 print:bg-white print:p-0">
        {/* Unified Executive Header */}
        <div className="print:hidden">
          <HeaderNavbar
            madrasahName={madrasahName}
            userName={user?.name ?? undefined}
            userRole={user?.role ?? undefined}
          />
        </div>

        {/* Dynamic Route Content with Smooth Page Animation */}
        <main className="flex-1 px-4 sm:px-6 xl:px-8 py-6 w-full flex flex-col gap-6 print:p-0 print:m-0 print:gap-0 print:block">
          <div className="animate-page-enter flex-1 flex flex-col gap-6">
            {children}
          </div>
        </main>

        {/* Unified Official Footer */}
        <div className="print:hidden">
          <Footer />
        </div>
      </div>
    </div>
  );
}
