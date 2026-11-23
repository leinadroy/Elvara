"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";

/** Setujui/tolak koreksi absensi, dengan catatan opsional. */
export function DecideButtons({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const decide = (action: "approve" | "reject") =>
    start(async () => {
      setError(null);
      const res = await apiSend("POST", `/attendance/corrections/${id}/${action}`, { note: note || undefined });
      if (!res.ok) return setError(res.error.message);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2 sm:w-64">
      <input aria-label={`Catatan keputusan untuk ${label}`} placeholder="Catatan (opsional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide("approve")}>
          Setujui
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("reject")}>
          Tolak
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
