"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CORRECTABLE_FIELD_LABELS, GENDER_LABELS, type CorrectableField, type CorrectionView } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiSend } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

function show(field: CorrectableField, v: unknown): string {
  if (v === null || v === undefined || v === "") return "(kosong)";
  if (field === "gender") return GENDER_LABELS[v as "MALE" | "FEMALE"];
  if (field === "birthDate") return formatDate(String(v));
  return String(v);
}

export function ChangeList({ changes }: { changes: CorrectionView["changes"] }) {
  return (
    <table className="w-full max-w-xl text-sm">
      <caption className="sr-only">Perubahan yang diajukan</caption>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th className="py-1 pr-3 font-medium">Data</th>
          <th className="py-1 pr-3 font-medium">Saat ini</th>
          <th className="py-1 font-medium">Diajukan</th>
        </tr>
      </thead>
      <tbody>
        {(Object.entries(changes) as [CorrectableField, { from: unknown; to: unknown }][]).map(([f, c]) => (
          <tr key={f} className="border-t align-top">
            <td className="py-1 pr-3 text-muted-foreground">{CORRECTABLE_FIELD_LABELS[f]}</td>
            <td className="py-1 pr-3 line-through decoration-muted-foreground/50">{show(f, c.from)}</td>
            <td className="py-1 font-medium">{show(f, c.to)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Setujui menerapkan perubahan ke data resmi; tolak wajib dengan alasan. */
export function ReviewActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function act(kind: "approve" | "reject") {
    if (kind === "approve" && !window.confirm(`Setujui dan terapkan koreksi data ${name}?`)) return;
    setError(null);
    start(async () => {
      const res = await apiSend("POST", `/corrections/${id}/${kind}`, { note });
      if (!res.ok) return setError(res.error.fieldErrors?.note?.[0] ?? res.error.message);
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-64">
      <label className="text-xs text-muted-foreground" htmlFor={`note-${id}`}>
        Catatan (wajib bila menolak)
      </label>
      <Textarea id={`note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => act("approve")}>
          Setujui
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => act("reject")}>
          Tolak
        </Button>
      </div>
    </div>
  );
}
