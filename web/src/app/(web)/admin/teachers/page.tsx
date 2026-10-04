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
    npsn: madrasah?.npsn || null,
    address: madrasah?.address || null,
    phone: madrasah?.phone || null,
    email: madrasah?.email || null,
    radiusMeters: madrasah?.settings?.radiusMeters || 50,
    positions: data?.positions || [],
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      gelarDepan: t.gelarDepan,
      gelarBelakang: t.gelarBelakang,
      pegId: t.pegId,
      nuptk: t.nuptk,
      nip: t.nip,
      nik: t.nik,
      tempatLahir: t.tempatLahir,
      tanggalLahir: t.tanggalLahir,
      gender: t.gender,
      statusKepegawaian: t.statusKepegawaian,
      jenisGtk: t.jenisGtk,
      email: t.email,
      phone: t.phone,
      avatarUrl: t.avatarUrl,
      isActive: t.isActive,
      positionId: t.positionId,
      position: t.position,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _count: t._count,
    })),
  };

  return <TeacherManagementView initialData={initialData} />;
}
