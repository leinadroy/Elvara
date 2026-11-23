import type { Metadata } from "next";
import { Suspense } from "react";
import { ChildTabs, resolveChild } from "@/components/attendance/child-picker";
import { ClassTimetableView } from "@/components/attendance/personal-attendance";
import { LoadingBlock, PageHeader } from "@/components/page-states";
import { flatParams } from "@/lib/api-server";

export const metadata: Metadata = { title: "Jadwal anak" };

async function Content({ searchParams }: PageProps<"/guardian/timetable">) {
  const { children, chosen } = await resolveChild(flatParams(await searchParams).studentId);
  return (
    <>
      <PageHeader title={chosen ? `Jadwal ${chosen.fullName}` : "Jadwal anak"} />
      <ChildTabs basePath="/guardian/timetable" items={children} chosenId={chosen?.studentId ?? null} />
      {chosen && <ClassTimetableView studentId={chosen.studentId} />}
    </>
  );
}

export default function GuardianJadwalPage(props: PageProps<"/guardian/timetable">) {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <Content {...props} />
    </Suspense>
  );
}
