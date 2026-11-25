import Link from "next/link";
import { REPORT_CARD_STATUSES, REPORT_CARD_STATUS_LABELS, type PortalReportCards, type ReportCardClass, type ReportCardDetail, type ReportCardOverview } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, PageHeader } from "@/components/page-states";
import { ReportCardContentView, ReportCardStatusBadge, ReportCardVersions } from "@/components/report-cards/bits";
import { NoteForm, ReasonAction } from "@/components/report-cards/card-forms";
import { apiGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";

/** Progres rapor per rombel. base: awalan URL area (mis. /teacher/report-cards). */
export async function ReportCardOverviewView({ base, termId }: { base: string; termId?: string }) {
  const res = await apiGet<ReportCardOverview>(`/report-cards/overview${termId ? `?termId=${termId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const o = res.data;
  if (!o.term) return <EmptyState title="Belum ada semester berjalan" />;
  if (!o.classes.length) return <EmptyState title="Tidak ada rombel" description="Rapor rombel tampil untuk wali kelas rombel itu, kurikulum, dan pimpinan." />;
  const waiting = o.classes.reduce((n, c) => n + c.counts.SUBMITTED, 0);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {o.term.name}
        {o.canApprove && (waiting ? ` · ${waiting} rapor menunggu persetujuan Anda` : " · tidak ada rapor yang menunggu persetujuan")}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {o.classes.map((c) => {
          const done = c.counts.PUBLISHED;
          return (
            <li key={c.classGroup.id}>
              <Link href={`${base}/${c.classGroup.id}`} className="flex h-full flex-col gap-2 rounded-2xl border bg-card p-4 hover:border-[var(--module)]">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold">{c.classGroup.code}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {done}/{c.students} terbit
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{c.homeroomTeacher ? `Wali kelas ${c.homeroomTeacher}` : "Wali kelas belum ditetapkan"}</span>
                <span className="flex flex-wrap gap-1 text-xs">
                  {REPORT_CARD_STATUSES.filter((s) => c.counts[s] > 0).map((s) => (
                    <span key={s} className={`rounded-md px-1.5 py-0.5 ${s === "SUBMITTED" && o.canApprove ? "border border-[var(--module)] font-medium" : "bg-muted"}`}>
                      {REPORT_CARD_STATUS_LABELS[s]} {c.counts[s]}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Rapor satu rombel: status dan masalah per siswa, ajukan (wali kelas) atau setujui (pimpinan) sekaligus. */
export async function ReportCardClassView({ base, classGroupId, termId }: { base: string; classGroupId: string; termId?: string }) {
  const res = await apiGet<ReportCardClass>(`/report-cards?classGroupId=${classGroupId}${termId ? `&termId=${termId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const k = res.data;
  const ready = k.rows.filter((r) => (r.status === "DRAFT" || r.status === "RETURNED") && !r.issues.length).map((r) => r.id);
  const blocked = k.rows.filter((r) => r.issues.length).length;
  const submitted = k.rows.filter((r) => r.status === "SUBMITTED").map((r) => r.id);
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={`Rapor ${k.classGroup.code}`} description="Pratinjau, masalah, dan status rapor setiap siswa." back={{ href: base, label: "Daftar rombel" }} />
      <div className="flex flex-wrap items-start gap-3 rounded-2xl border bg-card p-4">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {k.term.name} · {k.rows.length} siswa{k.homeroomTeacher && ` · Wali kelas ${k.homeroomTeacher}`}
          {blocked > 0 && <span className="block font-medium text-foreground">{blocked} rapor masih bermasalah dan belum dapat diajukan.</span>}
        </p>
        {k.canSubmit && ready.length > 0 && <ActionButton path="/report-cards/submit" body={{ ids: ready }} label={`Ajukan ${ready.length} rapor`} variant="default" confirm={`Ajukan ${ready.length} rapor ke kepala sekolah? Deskripsi dan catatan terkunci sampai diputuskan.`} />}
        {k.canApprove && submitted.length > 0 && (
          <ActionButton path="/report-cards/approve" body={{ ids: submitted }} label={`Setujui & terbitkan ${submitted.length}`} variant="default" pendingLabel="Membuat PDF…" confirm={`Setujui dan terbitkan ${submitted.length} rapor? Siswa dan wali akan diberi tahu.`} />
        )}
      </div>
      <ul className="flex flex-col divide-y rounded-2xl border bg-card">
        {k.rows.map((r) => (
          <li key={r.id}>
            <Link href={`${base}/card/${r.id}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/50">
              <span className="min-w-48 flex-1">
                <span className="font-medium">{r.student.fullName}</span>
                <span className="block text-xs text-muted-foreground">
                  {r.student.nis}
                  {r.currentVersionNo > 0 && ` · versi terbit ${r.currentVersionNo}`}
                  {r.submittedAt && r.status === "SUBMITTED" && ` · diajukan ${formatDateTime(r.submittedAt)}`}
                </span>
                {r.returnNote && r.status === "RETURNED" && <span className="block text-xs text-primary">Dikembalikan: {r.returnNote}</span>}
              </span>
              <span className="flex flex-col items-end gap-1">
                <ReportCardStatusBadge status={r.status} />
                {r.issues.length > 0 && <span className="text-xs text-muted-foreground">{r.issues.length} masalah</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!k.rows.length && <EmptyState title="Belum ada siswa di rombel ini" />}
    </div>
  );
}

/** Detail satu rapor: pratinjau/snapshot, masalah, catatan, dan aksi sesuai peran. */
export async function ReportCardDetailView({ id, base }: { id: string; base: string }) {
  const res = await apiGet<ReportCardDetail>(`/report-cards/${id}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const d = res.data;
  const editable = d.status === "DRAFT" || d.status === "RETURNED";
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Rapor ${d.content.student.fullName}`} description={`${d.content.term.name} · Rombel ${d.content.classGroup.code}`} back={{ href: `${base}/${d.content.classGroup.id}`, label: `Rapor ${d.content.classGroup.code}` }} />
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ReportCardStatusBadge status={d.status} />
          {d.submittedAt && d.status === "SUBMITTED" && <span className="text-sm text-muted-foreground">Diajukan {formatDateTime(d.submittedAt)}</span>}
          {d.status === "PUBLISHED" && <span className="text-sm text-muted-foreground">Menampilkan versi terbit terakhir; isi tidak berubah walau nilai sumber berubah.</span>}
        </div>
        {d.returnNote && d.status === "RETURNED" && (
          <p role="status" className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium">Dikembalikan kepala sekolah:</span> {d.returnNote}
          </p>
        )}
        {d.pendingRevisionReason && editable && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Revisi dibuka:</span> {d.pendingRevisionReason}. Versi terbit sebelumnya tetap tersimpan.
          </p>
        )}
        {editable &&
          (d.issues.length ? (
            <div className="text-sm">
              <p className="font-medium">Masalah yang harus diselesaikan sebelum diajukan:</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {d.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada masalah. Rapor siap diajukan.</p>
          ))}
        <div className="flex flex-wrap items-start gap-2">
          {d.canSubmit && editable && !d.issues.length && <ActionButton path="/report-cards/submit" body={{ ids: [d.id] }} label="Ajukan ke kepala sekolah" variant="default" />}
          {d.canApprove && d.status === "SUBMITTED" && (
            <>
              <ActionButton path="/report-cards/approve" body={{ ids: [d.id] }} label="Setujui & terbitkan" variant="default" pendingLabel="Membuat PDF…" confirm="Setujui dan terbitkan rapor ini? Siswa dan wali akan diberi tahu." />
              <ReasonAction kind="return" id={d.id} />
            </>
          )}
          {d.canSubmit && d.status === "PUBLISHED" && <ReasonAction kind="revise" id={d.id} />}
        </div>
        {d.canSubmit && editable && <NoteForm id={d.id} note={d.content.homeroomNote} />}
      </section>
      <ReportCardContentView c={d.content} />
      <ReportCardVersions versions={d.versions} />
    </div>
  );
}

/** Rapor terbit untuk siswa atau anak (wali). */
export async function PortalReportCardsView({ studentId }: { studentId?: string }) {
  const res = await apiGet<PortalReportCards>(`/me/report-cards${studentId ? `?studentId=${studentId}` : ""}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (!res.data.items.length) return <EmptyState title="Belum ada rapor terbit" description="Rapor tampil setelah disetujui kepala sekolah. Anda akan menerima notifikasi." />;
  return (
    <div className="flex flex-col gap-6">
      {res.data.items.map((r) => (
        <section key={r.id} aria-label={r.term.name} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{r.term.name}</h2>
            <span className="text-sm text-muted-foreground">
              Versi {r.versionNo} · terbit {formatDateTime(r.publishedAt)}
            </span>
            {r.versions[0] && (
              <a href={r.versions[0].fileUrl} className="ml-auto inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                Unduh PDF
              </a>
            )}
          </div>
          <ReportCardContentView c={r.content} />
          {r.versions.length > 1 && <ReportCardVersions versions={r.versions} />}
        </section>
      ))}
    </div>
  );
}
