import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CORRECTABLE_FIELD_LABELS,
  CORRECTION_STATUS_LABELS,
  GENDER_LABELS,
  ROLE_LABELS,
  STUDENT_STATUS_LABELS,
  type CorrectableField,
  type CorrectionView,
  type PersonDocumentView,
  type PersonView,
  type StudentStatus,
} from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/actions";
import { DocumentsPanel } from "@/components/documents-panel";
import { ApiErrorState, Chip, DefinitionList, LoadingBlock, PageHeader } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { apiGet, getMe } from "@/lib/api-server";
import { formatDate, formatDateTime } from "@/lib/format";
import { CorrectionForm } from "./correction-form";

export const metadata: Metadata = { title: "Profil saya" };

type Profile = {
  person: PersonView;
  student: { nis: string; nisn: string | null; status: StudentStatus; enrolledAt: string | null } | null;
  employee: { employeeNumber: string; position: string; isTeacher: boolean; status: string } | null;
};

const TABS = ["koreksi", "dokumen"] as const;
type Tab = (typeof TABS)[number];

function show(field: CorrectableField, v: unknown): string {
  if (v === null || v === undefined || v === "") return "(kosong)";
  if (field === "gender") return GENDER_LABELS[v as "MALE" | "FEMALE"];
  if (field === "birthDate") return formatDate(String(v));
  return String(v);
}

async function Content({ searchParams }: PageProps<"/me">) {
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "koreksi";
  const [me, res, corrections] = await Promise.all([getMe(), apiGet<Profile>("/me/profile"), apiGet<CorrectionView[]>("/me/corrections")]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const { person, student, employee } = res.data;
  const docs = tab === "dokumen" ? await apiGet<PersonDocumentView[]>("/me/documents") : null;
  const pending = corrections.ok ? corrections.data.find((c) => c.status === "PENDING") : undefined;

  return (
    <>
      <PageHeader title="Profil saya" description="Data resmi diubah oleh tata usaha. Ajukan koreksi bila ada yang salah." />
      <section className="overflow-hidden rounded-2xl border bg-card" aria-label="Data diri">
        <div aria-hidden="true" className="h-2 bg-[var(--module)]" />
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">{person.fullName}</h2>
              <p className="text-sm text-muted-foreground">{me.user.email}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {me.roles.map((r) => (
                <Chip key={r}>{ROLE_LABELS[r]}</Chip>
              ))}
            </div>
          </div>
          <DefinitionList
            items={[
              { label: "Jenis kelamin", value: person.gender ? GENDER_LABELS[person.gender] : null },
              { label: "Tempat, tanggal lahir", value: [person.birthPlace, person.birthDate && formatDate(person.birthDate)].filter(Boolean).join(", ") },
              { label: "Telepon", value: person.phone },
              { label: "Alamat", value: person.address },
              ...(student
                ? [
                    { label: "NIS / NISN", value: [student.nis, student.nisn].filter(Boolean).join(" / ") },
                    { label: "Status siswa", value: STUDENT_STATUS_LABELS[student.status] },
                  ]
                : []),
              ...(employee
                ? [
                    { label: "Nomor pegawai", value: employee.employeeNumber },
                    { label: "Jabatan", value: employee.position },
                  ]
                : []),
            ]}
          />
        </div>
      </section>

      <RecordTabs
        basePath="/me"
        active={tab}
        tabs={[
          { key: "koreksi", label: "Pengajuan koreksi", count: corrections.ok ? corrections.data.length : undefined },
          { key: "dokumen", label: "Dokumen saya" },
        ]}
      />
      <TabPanel>
        {tab === "koreksi" && (
          <>
            {pending ? (
              <p className="rounded-xl border bg-[var(--module-tint)] p-3 text-sm">Pengajuan Anda sedang ditinjau. Pengajuan baru bisa dibuat setelah yang ini selesai atau dibatalkan.</p>
            ) : (
              <CorrectionForm person={person} />
            )}
            {corrections.ok && corrections.data.length > 0 && (
              <ul className="flex flex-col divide-y rounded-xl border bg-card">
                {corrections.data.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === "APPROVED" ? "default" : c.status === "PENDING" ? "secondary" : "outline"}>{CORRECTION_STATUS_LABELS[c.status]}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                      </div>
                      {c.status === "PENDING" && <ActionButton path={`/me/corrections/${c.id}/cancel`} label="Batalkan pengajuan" confirm="Batalkan pengajuan koreksi ini?" />}
                    </div>
                    <ul className="text-sm">
                      {(Object.entries(c.changes) as [CorrectableField, { from: unknown; to: unknown }][]).map(([f, ch]) => (
                        <li key={f}>
                          <span className="text-muted-foreground">{CORRECTABLE_FIELD_LABELS[f]}:</span> {show(f, ch.from)} → <span className="font-medium">{show(f, ch.to)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">Alasan: {c.reason}</p>
                    {c.reviewNote && <p className="text-xs">Catatan petugas: {c.reviewNote}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {tab === "dokumen" &&
          (docs?.ok ? <DocumentsPanel personId={person.id} documents={docs.data} canManage={false} /> : docs && !docs.ok ? <ApiErrorState status={docs.status} error={docs.error} /> : null)}
      </TabPanel>
    </>
  );
}

export default function MePage(props: PageProps<"/me">) {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <Content {...props} />
    </Suspense>
  );
}
