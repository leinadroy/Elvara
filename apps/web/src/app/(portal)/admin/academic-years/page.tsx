import type { Metadata } from "next";
import { Suspense } from "react";
import { ACADEMIC_YEAR_STATUS_LABELS, type AcademicYearView } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/actions";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, getMe } from "@/lib/api-server";
import { formatDate } from "@/lib/format";
import { AcademicYearForm } from "./academic-year-form";

export const metadata: Metadata = { title: "Tahun ajaran" };

async function Content() {
  const [me, res] = await Promise.all([getMe(), apiGet<AcademicYearView[]>("/academic-years")]);
  const canManage = me.permissions.includes("academic-years:manage");
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      {res.data.length === 0 && <EmptyState title="Belum ada tahun ajaran" description="Buat tahun ajaran beserta semesternya, lalu aktifkan." />}
      {res.data.map((y) => (
        <Card key={y.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>
                {y.name}{" "}
                <Badge variant={y.status === "ACTIVE" ? "default" : y.status === "DRAFT" ? "secondary" : "outline"}>{ACADEMIC_YEAR_STATUS_LABELS[y.status]}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatDate(y.startDate)} – {formatDate(y.endDate)}
              </p>
            </div>
            {canManage && y.status === "DRAFT" && (
              <ActionButton path={`/academic-years/${y.id}/activate`} label="Aktifkan" variant="default" confirm={`Aktifkan tahun ajaran ${y.name}?`} />
            )}
            {canManage && y.status === "ACTIVE" && (
              <ActionButton
                path={`/academic-years/${y.id}/close`}
                label="Tutup tahun ajaran"
                variant="destructive"
                confirm={`Tutup tahun ajaran ${y.name}? Tahun ajaran yang ditutup tidak dapat diaktifkan lagi.`}
              />
            )}
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {y.terms.map((t) => (
                <li key={t.id} className="rounded-lg border p-2 text-sm">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.startDate)} – {formatDate(t.endDate)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      {canManage && <AcademicYearForm />}
    </>
  );
}

export default function AcademicYearsPage() {
  return (
    <>
      <PageHeader
        title="Tahun ajaran"
        description="Hanya satu tahun ajaran yang aktif. Tutup tahun ajaran berjalan sebelum mengaktifkan yang baru; data tahun lama tetap tersimpan."
      />
      <Suspense fallback={<LoadingBlock />}>
        <Content />
      </Suspense>
    </>
  );
}
