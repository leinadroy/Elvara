import type { GradeAggregateVersion } from "@smart-school/contracts";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api-server";

const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export async function GradeRecap({ assignmentId, mode = "teacher" }: { assignmentId: string; mode?: "teacher" | "academic" }) {
  const endpoint = mode === "teacher" ? "/assessments/aggregates" : "/grade-recap";
  const result = await apiGet<GradeAggregateVersion[]>(`${endpoint}?teachingAssignmentId=${encodeURIComponent(assignmentId)}`);
  if (!result.ok) return <ApiErrorState status={result.status} error={result.error} />;
  if (!result.data.length) return <EmptyState title="Belum ada nilai terbit" description="Rekap muncul setelah penilaian pertama diterbitkan." />;

  return <div className="grid min-w-0 gap-4">
    {result.data.map((version) => (
      <div key={version.schemeVersionId} className="min-w-0 rounded-lg border bg-card">
        <Table>
          <TableCaption className="caption-top m-0 px-4 py-3 text-left">
            Skema versi {version.versionNo}{version.passingScore !== null && ` · KKTP ${number.format(version.passingScore)}`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Siswa</TableHead>
              {version.students[0]?.components.map((component) => (
                <TableHead key={component.id} scope="col">{component.name} ({number.format(component.weight)}%)</TableHead>
              ))}
              <TableHead scope="col">Nilai akhir</TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {version.students.map((student) => (
              <TableRow key={student.studentId}>
                <th scope="row" className="px-2 py-3 text-left font-medium">
                  {student.fullName}<span className="block text-xs text-muted-foreground">NIS {student.nis}</span>
                </th>
                {student.components.map((component) => (
                  <TableCell key={component.id} className="tabular-nums">
                    {component.status === "INCOMPLETE" ? "Belum lengkap" : component.average === null ? "Tidak berlaku" : number.format(component.average)}
                  </TableCell>
                ))}
                <TableCell className="font-semibold tabular-nums">{student.finalScore ?? "—"}</TableCell>
                <TableCell>
                  {student.status === "INCOMPLETE" ? "Belum lengkap" : student.status === "EXCUSED" ? "Tidak berlaku" : student.needsFollowUp ? "Perlu tindak lanjut" : student.needsFollowUp === false ? "Tuntas" : "Lengkap"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ))}
  </div>;
}
