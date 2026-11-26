import { Suspense } from "react";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, flatParams } from "@/lib/api-server";
import { GradeRecap } from "../../teacher/assessments/grade-recap";

const path = "/academics/grade-recap";

async function Recap({ searchParams }: PageProps<"/academics/grade-recap">) {
  const requested = flatParams(await searchParams).teachingAssignmentId;
  const result = await apiGet<{ id: string; label: string }[]>("/grade-recap/options");
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.length) return <EmptyState title="Belum ada penugasan mengajar" />;
  const selected = result.data.find((assignment) => assignment.id === requested);
  return <div className="grid min-w-0 gap-4">
    <Picker key={selected?.id ?? "empty"} action={path}
      fields={[{ name: "teachingAssignmentId", label: "Kelas dan mata pelajaran", value: selected?.id,
        placeholder: "Pilih penugasan", options: result.data.map(({ id, label }) => ({ value: id, label })) }]} />
    {selected ? <GradeRecap assignmentId={selected.id} mode="academic" /> : <EmptyState title="Pilih penugasan untuk melihat rekap nilai" />}
  </div>;
}

export default function AcademicGradeRecapPage(props: PageProps<"/academics/grade-recap">) {
  return <><PageHeader title="Rekap nilai sekolah" /><Suspense fallback={<LoadingBlock rows={4} />}><Recap {...props} /></Suspense></>;
}
