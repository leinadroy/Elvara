import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUSES, type PersonalAttendance, type PublishedTimetable } from "@smart-school/contracts";
import { WeekTimetable } from "@/components/academics/week-timetable";
import { ApiErrorState, EmptyState } from "@/components/page-states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { AttendanceBadge } from "./status";

/** Kehadiran pribadi (siswa) atau anak (wali, perlu izin absensi). Default 30 hari terakhir. */
export async function PersonalAttendanceView({ studentId }: { studentId?: string }) {
  const res = await apiGet<PersonalAttendance>(`/me/attendance${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const a = res.data;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {formatDate(a.from)} – {formatDate(a.to)}. Sesi yang dibatalkan tidak dihitung.
      </p>
      <dl className="grid grid-cols-5 gap-2 text-center sm:max-w-xl">
        {ATTENDANCE_STATUSES.map((k) => (
          <div key={k} className={`rounded-xl p-2 ${k === "ABSENT" && a.counts[k] ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <dd className="text-2xl font-bold tabular-nums">{a.counts[k]}</dd>
            <dt className="text-xs">{ATTENDANCE_STATUS_LABELS[k]}</dt>
          </div>
        ))}
      </dl>
      {a.items.length === 0 ? (
        <EmptyState title="Belum ada catatan kehadiran pada rentang ini" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelajaran</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {a.items.map((i, n) => (
                <TableRow key={n} className={i.sessionStatus === "CANCELLED" ? "text-muted-foreground" : ""}>
                  <TableCell>{formatDate(i.date)}</TableCell>
                  <TableCell>{i.subject ?? "Sesi tambahan"}</TableCell>
                  <TableCell>{i.classGroupCode}</TableCell>
                  <TableCell>{i.sessionStatus === "CANCELLED" ? "Sesi dibatalkan" : <AttendanceBadge status={i.status} />}</TableCell>
                  <TableCell className="text-xs">{i.note ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/** Jadwal kelas siswa atau anak (wali, izin akademik). */
export async function ClassTimetableView({ studentId }: { studentId?: string }) {
  const res = await apiGet<PublishedTimetable & { classGroup: { code: string } | null }>(`/me/class-timetable${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (!res.data.classGroup) return <EmptyState title="Belum ditempatkan di rombel" description="Jadwal tampil setelah siswa ditempatkan di rombel oleh bagian akademik." />;
  if (!res.data.slots.length) return <EmptyState title="Jadwal belum diterbitkan" description={`Rombel ${res.data.classGroup.code}. Jadwal tampil setelah bagian kurikulum menerbitkannya.`} />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Rombel {res.data.classGroup.code}
        {res.data.term && ` · ${res.data.term.name}`}
      </p>
      <WeekTimetable slots={res.data.slots} show="teacher" />
    </div>
  );
}
