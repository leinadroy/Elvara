"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

/** Membuka (atau melanjutkan) sesi absensi untuk satu jadwal hari ini, lalu pindah ke halaman pengisian. */
export function OpenSessionButton({ timetableSlotId, date, sessionId, label }: { timetableSlotId: string; date: string; sessionId: string | null; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (sessionId) {
    return (
      <Button size="sm" variant="outline" onClick={() => router.push(`/teacher/attendance/sessions/${sessionId}`)}>
        {label ?? "Lihat absensi"}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await apiSend<{ id: string }>("POST", "/attendance/sessions", { timetableSlotId, date });
            if (!res.ok) return setError(res.error.message);
            router.push(`/teacher/attendance/sessions/${res.data.id}`);
          })
        }
      >
        {pending ? "Membuka…" : (label ?? "Isi absensi")}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
