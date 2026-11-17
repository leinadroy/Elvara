import { Badge } from "@/components/ui/badge";
import { getApiHealth } from "@/lib/api";

/** Status koneksi web → API → database. Dibaca saat request, jadi harus dibungkus <Suspense>. */
export async function ApiStatus() {
  const result = await getApiHealth();

  if (!result.ok) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="destructive">API tidak terjangkau</Badge>
        <span className="text-muted-foreground">
          Jalankan <code className="font-mono">npm run dev:api</code> lalu muat ulang halaman.
        </span>
      </div>
    );
  }

  const { status, checks, version } = result.data;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant={status === "ok" ? "default" : "secondary"}>
        API {status === "ok" ? "sehat" : "berjalan sebagian"}
      </Badge>
      <Badge variant={checks.database === "up" ? "outline" : "destructive"}>
        Database {checks.database === "up" ? "terhubung" : "tidak terhubung"}
      </Badge>
      <span className="text-muted-foreground">versi {version}</span>
    </div>
  );
}

export function ApiStatusFallback() {
  return (
    <div className="text-sm text-muted-foreground" role="status">
      Memeriksa koneksi API…
    </div>
  );
}
