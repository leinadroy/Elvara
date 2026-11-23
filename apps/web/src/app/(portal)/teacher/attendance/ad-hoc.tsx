"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";
import { selectClass } from "@/lib/ui";

/**
 * Sesi tambahan di luar jadwal (mis. upacara, kegiatan kelas) untuk rombel binaan. Alasan wajib dan tercatat;
 * peserta diambil dari penempatan yang berlaku pada tanggal sesi.
 */
export function AdHocSessionForm({ classes, today }: { classes: { id: string; code: string }[]; today: string }) {
  const router = useRouter();
  const [classGroupId, setClassGroupId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      method="post"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await apiSend<{ id: string }>("POST", "/attendance/sessions", { classGroupId, date, reason });
          if (!res.ok) return setError(res.error.fieldErrors ? Object.values(res.error.fieldErrors).flat().join(" ") || res.error.message : res.error.message);
          router.push(`/teacher/attendance/sessions/${res.data.id}`);
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Rombel
        <select value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} className={`${selectClass} sm:w-32`}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Tanggal
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={`${selectClass} sm:w-40`} />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
        Alasan
        <input value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={200} placeholder="mis. kegiatan kelas di luar jadwal" className={selectClass} />
      </label>
      <Button type="submit" size="sm" disabled={pending || reason.trim().length < 5 || !classGroupId}>
        {pending ? "Membuka…" : "Buka sesi tambahan"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
}
