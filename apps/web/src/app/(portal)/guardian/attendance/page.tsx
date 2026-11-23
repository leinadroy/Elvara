import type { Metadata } from "next";
import { Suspense } from "react";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { PersonalAttendanceView } from "@/components/attendance/personal-attendance";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Kehadiran anak" };

async function Content({ searchParams }: PageProps<"/guardian/attendance">) {
  const { children, chosen } = await resolveChild(flatParams(await searchParams).studentId);
  return (
    <>
      <PageHeader title={chosen ? `Kehadiran ${chosen.fullName}` : "Kehadiran anak"} />
      <ChildTabs basePath="/guardian/attendance" items={children} chosenId={chosen?.studentId ?? null} />
      {chosen && <PersonalAttendanceView studentId={chosen.studentId} />}
    </>
  );
}

export default function GuardianKehadiranPage(props: PageProps<"/guardian/attendance">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content {...props} />
    </Suspense>
  );
}
