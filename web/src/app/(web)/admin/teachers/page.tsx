import React from "react";
import { TeacherManagementView } from "@/features/teachers/components/teacher-management-view";
import { fetchTeachersData } from "@/server/actions/teacher.actions";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const res = await fetchTeachersData();
  const data = res?.data;
  const madrasah = data?.madrasah;
  const teachers = (data?.teachers || []) as any[];

  const initialData = {
    madrasahId: madrasah?.id || "",
    madrasahName: madrasah?.name || "Madrasah",
    nsm: madrasah?.nsm || "-",
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

  return <TeacherManagementView initialData={initialData} />;
}
