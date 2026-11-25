"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { ApiError } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";

const MAX_MB = 5;

/**
 * Pengumpulan tugas: teks dan/atau berkas (PDF/JPG/PNG). Setiap kiriman membawa kunci idempoten; bila koneksi
 * terputus lalu dikirim ulang, server tidak membuat versi ganda. Gagal unggah tidak menandai terkumpul.
 */
export function SubmitForm({ activityId, resubmit }: { activityId: string; resubmit: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      method="post"
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(null);
        const file = fileRef.current?.files?.[0];
        if (!text.trim() && !file) return setError("Tulis jawaban atau lampirkan berkas.");
        if (file && file.size > MAX_MB * 1024 * 1024) return setError(`Berkas maksimal ${MAX_MB} MB.`);
        const body = new FormData();
        body.set("idempotencyKey", key);
        if (text.trim()) body.set("text", text.trim());
        if (file) body.set("file", file);
        start(async () => {
          let res: Response;
          try {
            res = await fetch(`/api/v1/activities/${activityId}/submissions`, { method: "POST", body, credentials: "same-origin" });
          } catch {
            return setError("Koneksi terputus; kiriman belum tersimpan. Coba kirim lagi (tidak akan tercatat ganda).");
          }
          const json = (await res.json().catch(() => null)) as (ApiError & { versionNo?: number; late?: boolean }) | null;
          if (!res.ok) return setError(json?.fieldErrors ? Object.values(json.fieldErrors).flat().join(" ") || json.message : (json?.message ?? `Gagal (HTTP ${res.status}).`));
          setDone(`Terkirim sebagai versi ${json?.versionNo}${json?.late ? " (terlambat)" : ""}.`);
          setText("");
          if (fileRef.current) fileRef.current.value = "";
          setKey(crypto.randomUUID());
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Jawaban (teks)
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={10000} className="rounded-lg border bg-background p-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Berkas (opsional, PDF/JPG/PNG, maks. {MAX_MB} MB)
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="text-sm">
          {done}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Mengirim…" : resubmit ? "Kirim versi baru" : "Kumpulkan"}
        </Button>
      </div>
    </form>
  );
}
