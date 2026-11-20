import type { Metadata } from "next";
import { Suspense } from "react";
import {
  GUARDIAN_LINK_STATUS_LABELS,
  GUARDIAN_RELATIONSHIP_LABELS,
  STUDENT_STATUS_LABELS,
  type GuardianListItem,
  type Paginated,
  type PersonDocumentView,
  type StudentDetail,
} from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { AuditHistory } from "@/components/audit-history";
import { DocumentsPanel } from "@/components/documents-panel";
import { ApiErrorState, Chip, LoadingBlock } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { apiGet, getMe } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { StudentRecord } from "../student-form";
import { AccountInvite, GuardianLinkActions, LinkGuardianForm } from "./student-detail-client";

export const metadata: Metadata = { title: "Detail siswa" };

const TABS = ["wali", "dokumen", "akun", "riwayat"] as const;
type Tab = (typeof TABS)[number];

async function Content({ params, searchParams }: PageProps<"/admin/students/[studentId]">) {
  const [{ studentId }, sp] = await Promise.all([params, searchParams]);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "wali";
  const [me, res] = await Promise.all([getMe(), apiGet<StudentDetail>(`/students/${encodeURIComponent(studentId)}`)]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const s = res.data;
  const can = (p: (typeof me.permissions)[number]) => me.permissions.includes(p);
  const activeLinks = s.guardians.filter((g) => g.status !== "REVOKED");
  const docs = tab === "dokumen" && can("documents:read") ? await apiGet<PersonDocumentView[]>(`/people/${s.personId}/documents`) : null;
  const guardians = tab === "wali" && can("guardian-links:manage") ? await apiGet<Paginated<GuardianListItem>>("/guardians?pageSize=100") : null;
  const linkedIds = new Set(activeLinks.map((g) => g.guardianId));
  const base = `/admin/students/${s.id}`;

  const tabs = (
    <>
      <RecordTabs
        basePath={base}
        active={tab}
        tabs={[
          { key: "wali", label: "Orang tua / wali", count: activeLinks.length },
          ...(can("documents:read") ? [{ key: "dokumen", label: "Dokumen" }] : []),
          { key: "akun", label: "Akun portal" },
          ...(can("audit:read") ? [{ key: "riwayat", label: "Riwayat" }] : []),
        ]}
      />
      <TabPanel>
        {tab === "wali" && (
          <>
            {s.guardians.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada wali yang ditautkan.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-xl border bg-card">
                {s.guardians.map((g) => (
                  <li key={g.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">
                        {g.guardianName} <span className="text-sm font-normal text-muted-foreground">· {GUARDIAN_RELATIONSHIP_LABELS[g.relationship]}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant={g.status === "VERIFIED" ? "default" : g.status === "PENDING" ? "secondary" : "outline"}>{GUARDIAN_LINK_STATUS_LABELS[g.status]}</Badge>
                        {g.isPrimaryContact && <Chip>Kontak utama</Chip>}
                        {g.status === "VERIFIED" && <span>sejak {formatDateTime(g.verifiedAt)}</span>}
                        {g.status === "PENDING" && <span>{g.pendingInvitationExpiresAt ? `undangan berlaku sampai ${formatDateTime(g.pendingInvitationExpiresAt)}` : "undangan kedaluwarsa"}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Hak lihat: {[g.canViewAcademic && "akademik", g.canViewAttendance && "kehadiran", g.canViewFinance && "keuangan"].filter(Boolean).join(", ") || "tidak ada"}
                        {g.guardianEmail && ` · ${g.guardianEmail}`}
                      </p>
                    </div>
                    {can("guardian-links:manage") && g.status !== "REVOKED" && <GuardianLinkActions link={g} studentName={s.fullName} />}
                  </li>
                ))}
              </ul>
            )}
            {guardians?.ok && <LinkGuardianForm studentId={s.id} guardians={guardians.data.items.filter((g) => !linkedIds.has(g.id))} />}
            {guardians && !guardians.ok && <ApiErrorState status={guardians.status} error={guardians.error} />}
          </>
        )}
        {tab === "dokumen" &&
          (docs?.ok ? (
            <DocumentsPanel personId={s.personId} documents={docs.data} canManage={can("documents:manage")} />
          ) : docs && !docs.ok ? (
            <ApiErrorState status={docs.status} error={docs.error} />
          ) : null)}
        {tab === "akun" && (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm">
            {s.account ? (
              <p>
                {s.account.email} · <Badge variant={s.account.status === "ACTIVE" ? "default" : "outline"}>{s.account.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</Badge>
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">Siswa belum memiliki akun portal.</p>
                {can("accounts:manage") && <AccountInvite personId={s.personId} role="STUDENT" hasEmail={!!s.person.email} />}
              </>
            )}
          </div>
        )}
        {tab === "riwayat" && (
          <Suspense fallback={<LoadingBlock rows={3} />}>
            <AuditHistory
              targets={[
                { entityType: "student", entityId: s.id },
                { entityType: "person", entityId: s.personId },
              ]}
            />
          </Suspense>
        )}
      </TabPanel>
    </>
  );

  return (
    <StudentRecord
      key={s.id}
      student={s}
      readOnly={!can("people:manage")}
      badges={
        <>
          <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>{STUDENT_STATUS_LABELS[s.status]}</Badge>
          <Chip>{s.verifiedGuardianCount} wali terverifikasi</Chip>
        </>
      }
      tabs={tabs}
    />
  );
}

export default function StudentDetailPage(props: PageProps<"/admin/students/[studentId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <Content {...props} />
    </Suspense>
  );
}
