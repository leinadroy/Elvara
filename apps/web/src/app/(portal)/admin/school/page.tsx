import type { Metadata } from "next";
import { Suspense } from "react";
import { ROOM_TYPE_LABELS, type BuildingView, type SchoolView } from "@smart-school/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorState, DefinitionList, EmptyState, LoadingBlock, PageHeader } from "@/components/page-states";
import { apiGet, getMe } from "@/lib/api-server";
import { AddBuildingForm, AddFloorForm, AddRoomForm, RoomActiveToggle } from "./school-forms";

export const metadata: Metadata = { title: "Gedung & ruang" };

async function Content() {
  const [me, school, buildings] = await Promise.all([getMe(), apiGet<SchoolView>("/school"), apiGet<BuildingView[]>("/buildings")]);
  const canManage = me.permissions.includes("school:manage");
  return (
    <>
      {school.ok && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{school.data.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionList
              items={[
                { label: "NPSN", value: school.data.npsn },
                { label: "Alamat", value: school.data.address },
                { label: "Zona waktu", value: school.data.timezone },
              ]}
            />
          </CardContent>
        </Card>
      )}
      {!buildings.ok ? (
        <ApiErrorState status={buildings.status} error={buildings.error} />
      ) : buildings.data.length === 0 ? (
        <EmptyState title="Belum ada gedung" description="Tambahkan gedung, lalu lantai dan ruangnya." />
      ) : (
        buildings.data.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle>
                {b.name} <span className="font-mono text-sm text-muted-foreground">({b.code})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {b.floors.length === 0 && <p className="text-sm text-muted-foreground">Belum ada lantai.</p>}
              {b.floors.map((f) => (
                <section key={f.id} aria-labelledby={`floor-${f.id}`} className="flex flex-col gap-2">
                  <h3 id={`floor-${f.id}`} className="text-sm font-medium">
                    {f.name}
                  </h3>
                  {f.rooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada ruang.</p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {f.rooms.map((r) => (
                        <li key={r.id} className={`flex items-start justify-between gap-2 rounded-lg border p-2 text-sm ${r.isActive ? "" : "opacity-60"}`}>
                          <div>
                            <p className="font-medium">
                              {r.name} <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ROOM_TYPE_LABELS[r.type]}
                              {r.capacity ? ` · ${r.capacity} orang` : ""}
                              {!r.isActive && (
                                <Badge variant="outline" className="ml-1">
                                  Tidak dipakai
                                </Badge>
                              )}
                            </p>
                          </div>
                          {canManage && <RoomActiveToggle roomId={r.id} isActive={r.isActive} name={r.name} />}
                        </li>
                      ))}
                    </ul>
                  )}
                  {canManage && <AddRoomForm floorId={f.id} />}
                </section>
              ))}
              {canManage && <AddFloorForm buildingId={b.id} nextLevel={(b.floors.at(-1)?.level ?? 0) + 1} />}
            </CardContent>
          </Card>
        ))
      )}
      {canManage && <AddBuildingForm />}
    </>
  );
}

export default function SchoolPage() {
  return (
    <>
      <PageHeader title="Gedung & ruang" description="Struktur gedung, lantai, dan ruang. Kode ruang unik per gedung." />
      <Suspense fallback={<LoadingBlock />}>
        <Content />
      </Suspense>
    </>
  );
}
