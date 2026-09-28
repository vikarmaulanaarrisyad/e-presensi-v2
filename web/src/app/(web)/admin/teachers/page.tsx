import React from "react";
import { HeaderNavbar } from "@/components/organisms/header-navbar";
import { TeacherManagementView } from "@/features/teachers/components/teacher-management-view";
import { fetchTeachersData } from "@/server/actions/teacher.actions";

export default async function TeachersPage() {
  const res = await fetchTeachersData();
  const data = res?.data;
  const madrasah = data?.madrasah;
  const teachers = (data?.teachers || []) as any[];

  const initialData = {
    madrasahId: madrasah?.id || "",
    madrasahName: madrasah?.name || "MIN 1 Jakarta Selatan",
    nsm: madrasah?.nsm || "111131740001",
    radiusMeters: madrasah?.settings?.radiusMeters || 50,
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      nip: t.nip,
      phone: t.phone,
      avatarUrl: t.avatarUrl,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _count: t._count,
    })),
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-muted/20">
      <HeaderNavbar
        madrasahName={initialData.madrasahName}
        nsm={initialData.nsm}
        radiusMeters={initialData.radiusMeters}
      />

      <main className="flex-1 p-6 xl:p-8 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        <TeacherManagementView initialData={initialData} />
      </main>
    </div>
  );
}
