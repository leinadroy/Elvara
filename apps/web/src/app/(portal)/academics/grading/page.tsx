import type { Metadata } from "next";
import { Suspense } from "react";
import { SCHEME_STATUS_LABELS, type GradeSchemeRow, type GradeSchemeView, type LearningOutcomeView } from "@smart-school/contracts";
import { ActionButton } from "@/components/actions";
import { Picker } from "@/components/academics/picker";
import { ApiErrorState, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { RecordTabs, TabPanel } from "@/components/record";
import { getAcademicOptions, pickTerm } from "@/lib/academics";
import { apiGet, flatParams, getMe } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { OutcomeForm, SchemeEditor } from "./scheme-editor";

export const metadata: Metadata = { title: "Skema nilai" };
const BASE = "/academics/grading";

function Components({ s }: { s: GradeSchemeView }) {
  return (
    <ul className="flex flex-wrap gap-1.5 text-xs">
      {s.components.map((c) => (
        <li key={c.id} className="rounded-md bg-muted px-2 py-0.5">
          <span className="font-mono font-semibold">{c.code}</span> {c.name} · <span className="tabular-nums">{c.weight}%</span>
        </li>
      ))}
      {s.passingScore != null && <li className="rounded-md border px-2 py-0.5">KKTP {s.passingScore}</li>}
    </ul>
  );
}

async function SchemesTab({ termId, canManage }: { termId: string; canManage: boolean }) {
  const res = await apiGet<GradeSchemeRow[]>(`/grade-schemes?termId=${termId}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  if (!res.data.length) return <EmptyState title="Belum ada mapel yang diajarkan semester ini" description="Skema nilai disusun per mapel dan tingkat yang punya penugasan mengajar." />;
  return (
    <ul className="flex flex-col gap-3">
      {res.data.map((r) => (
        <li key={`${r.subject.id}:${r.gradeLevel.id}`} className={`flex flex-col gap-2 rounded-2xl border bg-card p-4 ${!r.published && r.taught ? "border-primary" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">
              {r.subject.name} · {r.gradeLevel.name}
            </h2>
            {r.published ? (
              <span className="rounded-md bg-secondary px-1.5 text-xs">
                {SCHEME_STATUS_LABELS.PUBLISHED} v{r.published.versionNo}
              </span>
            ) : (
              <span className="rounded-md bg-primary px-1.5 text-xs text-primary-foreground">Belum ada skema terbit</span>
            )}
            {!r.taught && <span className="text-xs text-muted-foreground">(tidak diajarkan semester ini)</span>}
          </div>
          {r.published && (
            <div className="flex flex-col gap-1">
              <Components s={r.published} />
              <p className="text-xs text-muted-foreground">Terbit {formatDateTime(r.published.publishedAt)}. Nilai akhir dibulatkan sekali ke bilangan bulat.</p>
            </div>
          )}
          {canManage &&
            (r.draft ? (
              <section aria-label="Draf skema" className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
                <h3 className="text-sm font-semibold">Draf versi {r.draft.versionNo}</h3>
                <SchemeEditor key={r.draft.id} scheme={r.draft} />
              </section>
            ) : r.published ? (
              <div>
                <ActionButton path={`/grade-schemes/${r.published.id}/revise`} label="Buat versi baru" size="xs" />
              </div>
            ) : (
              <section aria-label="Skema baru" className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
                <h3 className="text-sm font-semibold">Skema baru</h3>
                <SchemeEditor scheme={null} create={{ termId, subjectId: r.subject.id, gradeLevelId: r.gradeLevel.id }} />
              </section>
            ))}
        </li>
      ))}
    </ul>
  );
}

async function OutcomesTab({ sp, canManage }: { sp: Record<string, string | undefined>; canManage: boolean }) {
  const options = await getAcademicOptions();
  const subjects = (options?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }));
  const grades = (options?.gradeLevels ?? []).map((g) => ({ value: g.id, label: g.name }));
  const q = new URLSearchParams();
  if (sp.subjectId) q.set("subjectId", sp.subjectId);
  if (sp.gradeLevelId) q.set("gradeLevelId", sp.gradeLevelId);
  const res = await apiGet<LearningOutcomeView[]>(`/learning-outcomes?${q}`);
  if (!res.ok) return <ApiErrorState status={res.status} error={res.error} />;
  return (
    <>
      <Picker
        action={BASE}
        keep={{ tab: "capaian" }}
        submitLabel="Terapkan"
        fields={[
          { name: "subjectId", label: "Mata pelajaran", value: sp.subjectId, options: subjects, placeholder: "Semua" },
          { name: "gradeLevelId", label: "Tingkat", value: sp.gradeLevelId, options: grades, placeholder: "Semua" },
        ]}
      />
      {res.data.length ? (
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {res.data.map((o) => (
            <li key={o.id} className={`flex flex-col gap-1 p-3 text-sm ${o.status === "INACTIVE" ? "text-muted-foreground" : ""}`}>
              <p>
                <span className="font-mono font-semibold">{o.code}</span> · {o.subject.name} · {o.gradeLevel.name}
                {o.status === "INACTIVE" && " · nonaktif"}
              </p>
              <p>{o.description}</p>
              {canManage && <OutcomeForm row={o} subjects={subjects} grades={grades} />}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Belum ada capaian pembelajaran" description="Capaian dipakai guru untuk menulis deskripsi rapor." />
      )}
      {canManage && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Capaian baru</h2>
          <OutcomeForm subjects={subjects} grades={grades} defaults={{ subjectId: sp.subjectId, gradeLevelId: sp.gradeLevelId }} />
        </section>
      )}
    </>
  );
}

async function Content({ searchParams }: PageProps<"/academics/grading">) {
  const sp = flatParams(await searchParams);
  const tab = sp.tab === "capaian" ? "capaian" : "skema";
  const [me, options] = await Promise.all([getMe(), getAcademicOptions()]);
  const canManage = me.permissions.includes("grading:manage");
  const term = pickTerm(options, sp.termId);
  return (
    <>
      <RecordTabs
        basePath={BASE}
        active={tab}
        tabs={[
          { key: "skema", label: "Skema nilai" },
          { key: "capaian", label: "Capaian pembelajaran" },
        ]}
      />
      <TabPanel>
        {tab === "skema" ? (
          term ? (
            <>
              <Picker action={BASE} fields={[{ name: "termId", label: "Semester", value: term.id, options: (options?.terms ?? []).map((t) => ({ value: t.id, label: `${t.name}${t.current ? " (berjalan)" : ""}` })) }]} />
              <SchemesTab termId={term.id} canManage={canManage} />
            </>
          ) : (
            <EmptyState title="Belum ada semester" />
          )
        ) : (
          <OutcomesTab sp={sp} canManage={canManage} />
        )}
      </TabPanel>
    </>
  );
}

export default function GradingPage(props: PageProps<"/academics/grading">) {
  return (
    <>
      <PageHeader title="Skema nilai" description="Komponen dan bobot nilai per mapel dan tingkat untuk satu semester, serta capaian pembelajaran untuk deskripsi rapor." />
      <Suspense fallback={<LoadingBlock rows={6} />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
