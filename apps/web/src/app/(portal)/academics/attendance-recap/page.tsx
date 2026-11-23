import type { Metadata } from "next";
import { Suspense } from "react";
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUSES, type AttendanceRecap, type TeacherToday } from "@smart-school/contracts";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClasses } from "@/lib/academics";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Rekap absensi" };
const BASE = "/academics/attendance-recap";

function shift(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Rombel yang boleh direkap: semua bagi pembaca absensi, rombel binaan bagi wali kelas. */
async function classOptions(canReadAll: boolean) {
  if (canReadAll) return (await getClasses()).map((c) => ({ value: c.id, label: c.code }));
  const res = await apiGet<TeacherToday>("/teacher/today");
  return res.ok ? res.data.homeroomClasses.map((c) => ({ value: c.id, label: c.code })) : [];
}

async function Content({ searchParams }: PageProps<"/academics/attendance-recap">) {
  const sp = flatParams(await searchParams);
  const me = await getMe();
  const classes = await classOptions(me.permissions.includes("attendance:read") && me.permissions.includes("classes:read"));
  if (!classes.length) return <EmptyState title="Tidak ada rombel untuk direkap" description="Rekap tersedia bagi wali kelas (rombel binaan) dan pimpinan/kurikulum." />;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const classGroupId = classes.some((c) => c.value === sp.classGroupId) ? sp.classGroupId! : classes[0]!.value;
  const to = sp.to ?? today;
  const from = sp.from ?? shift(to, -29);
  const res = await apiGet<AttendanceRecap>(`/attendance/recap?classGroupId=${classGroupId}&from=${from}&to=${to}`);
  return (
    <>
      <Picker
        action={BASE}
        fields={[
          { name: "classGroupId", label: "Rombel", value: classGroupId, options: classes },
          { name: "from", label: "Dari", value: from, options: [], type: "date" },
          { name: "to", label: "Sampai", value: to, options: [], type: "date" },
        ]}
      />
      {!res.ok ? (
        <ApiErrorState status={res.status} error={res.error} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {res.data.classGroup.code} · {formatDate(res.data.from)} – {formatDate(res.data.to)} · {res.data.sessionCount} sesi dihitung
            {res.data.cancelledCount > 0 && `, ${res.data.cancelledCount} sesi dibatalkan tidak dihitung`}. Persentase = (Hadir + Terlambat) ÷ catatan terisi.
          </p>
          {res.data.rows.length ? (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden md:table-cell">NIS</TableHead>
                    {ATTENDANCE_STATUSES.map((k) => (
                      <TableHead key={k} className="text-right">
                        {ATTENDANCE_STATUS_LABELS[k]}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Belum diisi</TableHead>
                    <TableHead className="text-right">Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {res.data.rows.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell className="font-medium">{r.fullName}</TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">{r.nis}</TableCell>
                      {ATTENDANCE_STATUSES.map((k) => (
                        <TableCell key={k} className={`text-right tabular-nums ${k === "ABSENT" && r.counts[k] ? "font-bold text-primary" : ""}`}>
                          {r.counts[k]}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums text-muted-foreground">{r.unfilled}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{r.rate === null ? "—" : `${r.rate.toLocaleString("id-ID")}%`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="Belum ada sesi absensi pada rentang ini" />
          )}
        </>
      )}
    </>
  );
}

export default function AttendanceRecapPage(props: PageProps<"/academics/attendance-recap">) {
  return (
    <>
      <PageHeader title="Rekap absensi" description="Rekap per siswa untuk satu rombel dan periode." />
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
