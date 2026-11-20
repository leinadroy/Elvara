import type { Metadata } from "next";
import { Suspense } from "react";
import { EMPLOYEE_ROLES, ROLE_LABELS, type EmployeeDetail, type PersonDocumentView, type RoleKey } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { AuditHistory } from "@/components/audit-history";
import { DocumentsPanel } from "@/components/documents-panel";
import { ApiErrorState, Chip, LoadingBlock } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { apiGet, getMe } from "@/lib/api-server";
import { AccountInvite } from "../../students/[studentId]/student-detail-client";
import { EmployeeRecord } from "../employee-form";

export const metadata: Metadata = { title: "Detail pegawai" };

const TABS = ["akun", "dokumen", "riwayat"] as const;
type Tab = (typeof TABS)[number];

async function Content({ params, searchParams }: PageProps<"/admin/employees/[employeeId]">) {
  const [{ employeeId }, sp] = await Promise.all([params, searchParams]);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "akun";
  const [me, res] = await Promise.all([getMe(), apiGet<EmployeeDetail>(`/employees/${encodeURIComponent(employeeId)}`)]);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  const e = res.data;
  const can = (p: (typeof me.permissions)[number]) => me.permissions.includes(p);
  const docs = tab === "dokumen" && can("documents:read") ? await apiGet<PersonDocumentView[]>(`/people/${e.personId}/documents`) : null;

  const tabs = (
    <>
      <RecordTabs
        basePath={`/admin/employees/${e.id}`}
        active={tab}
        tabs={[
          { key: "akun", label: "Akun portal" },
          ...(can("documents:read") ? [{ key: "dokumen", label: "Dokumen" }] : []),
          ...(can("audit:read") ? [{ key: "riwayat", label: "Riwayat" }] : []),
        ]}
      />
      <TabPanel>
        {tab === "akun" && (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm">
            {e.account ? (
              <>
                <p>
                  {e.account.email} · <Badge variant={e.account.status === "ACTIVE" ? "default" : "outline"}>{e.account.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</Badge>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {e.account.roles.map((r) => (
                    <Chip key={r}>{ROLE_LABELS[r as RoleKey]}</Chip>
                  ))}
                </div>
                {can("accounts:manage") && <p className="text-xs text-muted-foreground">Ubah peran, status, atau verifikasi dua langkah di menu Akun pengguna.</p>}
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Pegawai belum memiliki akun.</p>
                {can("accounts:manage") && <AccountInvite personId={e.personId} roles={EMPLOYEE_ROLES} hasEmail={!!e.person.email} />}
              </>
            )}
          </div>
        )}
        {tab === "dokumen" &&
          (docs?.ok ? (
            <DocumentsPanel personId={e.personId} documents={docs.data} canManage={can("documents:manage")} />
          ) : docs && !docs.ok ? (
            <ApiErrorState status={docs.status} error={docs.error} />
          ) : null)}
        {tab === "riwayat" && (
          <Suspense fallback={<LoadingBlock rows={3} />}>
            <AuditHistory
              targets={[
                { entityType: "employee", entityId: e.id },
                { entityType: "person", entityId: e.personId },
              ]}
            />
          </Suspense>
        )}
      </TabPanel>
    </>
  );

  return (
    <EmployeeRecord
      key={e.id}
      employee={e}
      readOnly={!can("people:manage")}
      badges={
        <>
          <Badge variant={e.status === "ACTIVE" ? "default" : "secondary"}>{e.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</Badge>
          {e.isTeacher && <Chip>Guru</Chip>}
        </>
      }
      tabs={tabs}
    />
  );
}

export default function EmployeeDetailPage(props: PageProps<"/admin/employees/[employeeId]">) {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <Content {...props} />
    </Suspense>
  );
}
