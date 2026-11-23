"use client";

import { ArrowLeft, CheckCheck, RefreshCw, RotateCcw, Save, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_SHORT,
  ATTENDANCE_STATUSES,
  type AttendanceSessionDetail,
  type AttendanceStatus,
  type RosterRow,
} from "@smart-school/contracts";
import { AttendanceBadge, SessionBadge } from "@/components/attendance/status";
import { ActionButton } from "@/components/actions";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";

/** Status koneksi browser (FR-6.7). Perubahan tetap di layar saat offline; simpan setelah sinyal kembali. */
function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

type Draft = Record<string, { status: AttendanceStatus | null; note: string }>;
const initial = (roster: RosterRow[]): Draft => Object.fromEntries(roster.map((r) => [r.studentId, { status: r.status, note: r.note ?? "" }]));

/**
 * Lembar absensi (mobile-first): satu baris per siswa dengan tombol status besar, toolbar tetap
 * (Kembali, Muat ulang, Batalkan perubahan, Simpan). Setelah batas hari, baris hanya bisa diajukan koreksi.
 */
export function SessionSheet({ session }: { session: AttendanceSessionDetail }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initial(session.roster));
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [correcting, setCorrecting] = useState<string | null>(null);
  const online = useOnline();

  const changed = useMemo(
    () => session.roster.filter((r) => draft[r.studentId]!.status !== r.status || draft[r.studentId]!.note !== (r.note ?? "")),
    [draft, session.roster],
  );
  const dirty = changed.length > 0;
  const filled = session.roster.filter((r) => draft[r.studentId]!.status).length;
  const counts = ATTENDANCE_STATUSES.map((k) => [k, session.roster.filter((r) => draft[r.studentId]!.status === k).length] as const);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (studentId: string, patch: Partial<Draft[string]>) => setDraft((d) => ({ ...d, [studentId]: { ...d[studentId]!, ...patch } }));
  const confirmDiscard = () => !dirty || window.confirm("Ada perubahan yang belum disimpan. Tinggalkan perubahan ini?");

  function save() {
    setError(null);
    start(async () => {
      const res = await apiSend<{ changed: number }>("POST", `/attendance/sessions/${session.id}/records`, {
        records: changed.map((r) => ({ studentId: r.studentId, status: draft[r.studentId]!.status, note: draft[r.studentId]!.note || null })),
      });
      if (!res.ok) return setError(res.error.message);
      setSavedMsg(`Tersimpan ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`);
      router.refresh();
    });
  }

  const title = `${session.classGroup.code}${session.subject ? ` · ${session.subject.name}` : " · Sesi tambahan"}`;
  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-4">
      <div role="toolbar" aria-label="Aksi absensi" className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href="/teacher/attendance" onClick={(e) => !confirmDiscard() && e.preventDefault()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium hover:bg-muted">
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <Button type="button" variant="ghost" size="sm" disabled={refreshing} onClick={() => confirmDiscard() && startRefresh(() => router.refresh())}>
          <RefreshCw className={refreshing ? "animate-spin" : ""} /> Muat ulang
        </Button>
        <span role="status" className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${online ? "text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
          {online ? <Wifi className="size-3.5" aria-hidden="true" /> : <WifiOff className="size-3.5" aria-hidden="true" />}
          {online ? "Terhubung" : "Offline"}
        </span>
        <p aria-live="polite" className={`ml-auto text-xs ${dirty ? "font-medium text-primary" : "text-muted-foreground"}`}>
          {pending ? "Menyimpan…" : dirty ? `${changed.length} perubahan belum disimpan` : (savedMsg ?? `${filled}/${session.roster.length} terisi${filled ? " · tersimpan" : ""}`)}
        </p>
        {session.canEdit && (
          <>
            <Button type="button" variant="outline" size="sm" disabled={!dirty || pending} onClick={() => window.confirm("Batalkan semua perubahan?") && setDraft(initial(session.roster))}>
              <RotateCcw /> Batalkan perubahan
            </Button>
            <Button type="button" size="sm" disabled={!dirty || pending || !online} onClick={save}>
              <Save /> Simpan
            </Button>
          </>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="h-2 bg-[var(--module)]" aria-hidden="true" />
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(session.date)}
                {session.startTime && ` · ${session.startTime}–${session.endTime}`} · {session.takenBy.fullName}
              </p>
              {session.reason && <p className="text-sm text-muted-foreground">Keterangan: {session.reason}</p>}
            </div>
            <SessionBadge status={session.status} />
          </div>
          <dl className="flex flex-wrap gap-2 text-xs">
            {counts.map(([k, n]) => (
              <div key={k} className="rounded-md bg-muted px-2 py-1">
                <dt className="inline">{ATTENDANCE_STATUS_LABELS[k]}</dt> <dd className="inline font-bold tabular-nums">{n}</dd>
              </div>
            ))}
            <div className="rounded-md border border-dashed px-2 py-1">
              <dt className="inline">Belum diisi</dt> <dd className="inline font-bold tabular-nums">{session.roster.length - filled}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {session.status === "CANCELLED"
              ? "Sesi dibatalkan dan tidak dihitung dalam rekap."
              : session.canEdit
                ? `Bisa diubah langsung sampai ${formatDateTime(session.editableUntil)}.`
                : session.canRequestCorrection
                  ? "Batas hari sesi sudah lewat. Perubahan diajukan sebagai koreksi beralasan untuk disetujui wali kelas atau admin."
                  : "Hanya baca."}
          </p>
          {!online && (
            <p role="alert" className="rounded-lg border border-primary bg-accent px-3 py-2 text-sm text-accent-foreground">
              Koneksi terputus. Isian Anda tetap di layar ini dan belum terkirim; jangan tutup halaman. Tekan Simpan setelah sinyal kembali.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {session.canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDraft((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.status ? v : { ...v, status: "PRESENT" }])))}>
                <CheckCheck /> Tandai yang kosong sebagai Hadir
              </Button>
              {session.status === "OPEN" && (
                <ActionButton path={`/attendance/sessions/${session.id}/close`} label="Tutup sesi" confirm={dirty ? "Simpan perubahan dulu sebelum menutup sesi. Tetap tutup?" : "Tutup sesi ini? Catatan masih bisa diubah sampai akhir hari."} />
              )}
              <CancelSession sessionId={session.id} />
            </div>
          )}
        </div>
      </section>

      <ul className="flex flex-col gap-2" aria-label="Daftar siswa">
        {session.roster.map((r, i) => {
          const cur = draft[r.studentId]!;
          const rowChanged = cur.status !== r.status || cur.note !== (r.note ?? "");
          return (
            <li key={r.studentId} className={`flex flex-col gap-2 rounded-2xl border bg-card p-3 ${rowChanged ? "border-primary" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{r.fullName}</span> <span className="text-xs text-muted-foreground">NIS {r.nis}</span>
                </span>
                {!session.canEdit && <AttendanceBadge status={r.status} />}
                {r.pendingCorrection && <span className="text-xs text-muted-foreground">Koreksi menunggu → {ATTENDANCE_STATUS_LABELS[r.pendingCorrection.proposedStatus]}</span>}
              </div>
              {session.canEdit ? (
                <>
                  <div role="radiogroup" aria-label={`Status ${r.fullName}`} className="grid grid-cols-5 gap-1.5">
                    {ATTENDANCE_STATUSES.map((k) => {
                      const on = cur.status === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set(r.studentId, { status: on ? null : k })}
                          className={`flex h-11 flex-col items-center justify-center rounded-lg border text-xs font-medium ${on ? (k === "ABSENT" ? "border-primary bg-primary text-primary-foreground" : "border-foreground bg-foreground text-background") : "hover:bg-muted"}`}
                        >
                          <span className="text-sm font-bold">{ATTENDANCE_STATUS_SHORT[k]}</span>
                          <span className="hidden sm:inline">{ATTENDANCE_STATUS_LABELS[k]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {cur.status && cur.status !== "PRESENT" && (
                    <input
                      aria-label={`Catatan untuk ${r.fullName}`}
                      placeholder="Catatan (opsional), mis. surat dokter"
                      value={cur.note}
                      maxLength={200}
                      onChange={(e) => set(r.studentId, { note: e.target.value })}
                      className="h-9 rounded-lg border bg-background px-2 text-sm"
                    />
                  )}
                </>
              ) : (
                r.note && <p className="pl-8 text-xs text-muted-foreground">Catatan: {r.note}</p>
              )}
              {session.canRequestCorrection && r.recordId && !r.pendingCorrection && (
                <div className="pl-8">
                  {correcting === r.recordId ? (
                    <CorrectionForm recordId={r.recordId} current={r.status} onDone={() => setCorrecting(null)} />
                  ) : (
                    <Button type="button" variant="ghost" size="xs" onClick={() => setCorrecting(r.recordId)}>
                      Ajukan koreksi
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {session.canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur sm:hidden">
          <Button type="button" className="h-11 w-full" disabled={pending || !online} onClick={save}>
            <Save /> {!online ? "Menunggu koneksi…" : pending ? "Menyimpan…" : `Simpan ${changed.length} perubahan`}
          </Button>
        </div>
      )}
    </div>
  );
}

function CancelSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          const reason = window.prompt("Alasan pembatalan sesi (mis. kegiatan sekolah, guru berhalangan):");
          if (!reason) return;
          start(async () => {
            const res = await apiSend("POST", `/attendance/sessions/${sessionId}/cancel`, { reason });
            if (!res.ok) return setError(res.error.message);
            router.refresh();
          });
        }}
      >
        Batalkan sesi
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

function CorrectionForm({ recordId, current, onDone }: { recordId: string; current: AttendanceStatus | null; onDone: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<AttendanceStatus | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      method="post"
      className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await apiSend("POST", `/attendance/records/${recordId}/corrections`, { proposedStatus: status, reason });
          if (!res.ok) return setError(res.error.fieldErrors ? Object.values(res.error.fieldErrors).flat().join(" ") || res.error.message : res.error.message);
          onDone();
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs">
        Status usulan
        <select required value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} className="h-9 rounded-lg border bg-background px-2 text-sm">
          <option value="">Pilih…</option>
          {ATTENDANCE_STATUSES.filter((k) => k !== current).map((k) => (
            <option key={k} value={k}>
              {ATTENDANCE_STATUS_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs">
        Alasan
        <input required minLength={5} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" />
      </label>
      <div className="flex gap-1">
        <Button type="submit" size="sm" disabled={pending || !status || reason.trim().length < 5}>
          Ajukan
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Batal
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
}
