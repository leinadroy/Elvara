"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InvitationCreated } from "@smart-school/contracts";
import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

/** Tombol satu aksi API, dengan konfirmasi opsional untuk aksi berisiko dan pesan kesalahan di tempat. */
export function ActionButton({
  method = "POST",
  path,
  body,
  label,
  pendingLabel,
  confirm,
  variant = "outline",
  size = "sm",
  onSuccess,
}: {
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  label: string;
  pendingLabel?: string;
  confirm?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "default" | "xs";
  onSuccess?: (data: unknown) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const res = await apiSend(method, path, body);
            if (!res.ok) return setError(res.error.message);
            onSuccess?.(res.data);
            router.refresh();
          });
        }}
      >
        {pending ? (pendingLabel ?? "Memproses…") : label}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

/** Menampilkan tautan undangan sekali saja, dengan tombol salin. */
export function InvitationLink({ invitation, onClose }: { invitation: InvitationCreated; onClose?: () => void }) {
  const url = typeof window === "undefined" ? invitation.invitePath : `${window.location.origin}${invitation.invitePath}`;
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <p className="font-medium">Tautan undangan untuk {invitation.email}</p>
      <p className="text-xs text-muted-foreground">
        Kirimkan tautan ini lewat kanal resmi sekolah. Tautan hanya ditampilkan sekali dan berlaku sampai {formatDateTime(invitation.expiresAt)}.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label="Tautan undangan" className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => undefined);
            setCopied(true);
          }}
        >
          {copied ? "Tersalin" : "Salin tautan"}
        </Button>
        {onClose && (
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        )}
      </div>
    </div>
  );
}
