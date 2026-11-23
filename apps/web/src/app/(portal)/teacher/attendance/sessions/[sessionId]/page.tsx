import type { Metadata } from "next";
import { Suspense } from "react";
import type { AttendanceSessionDetail } from "@smart-school/contracts";
import { ApiErrorState, LoadingBlock } from "@/components/page-states";
import { apiGet } from "@/lib/api-server";
import { SessionSheet } from "./session-sheet";

export const metadata: Metadata = { title: "Pengisian absensi" };

async function Content({ params }: PageProps<"/teacher/attendance/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const res = await apiGet<AttendanceSessionDetail>(`/attendance/sessions/${sessionId}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return <SessionSheet key={res.data.roster.map((r) => `${r.studentId}:${r.status}:${r.versionNo}`).join(",")} session={res.data} />;
}

export default function SessionPage(props: PageProps<"/teacher/attendance/sessions/[sessionId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <Content {...props} />
    </Suspense>
  );
}
