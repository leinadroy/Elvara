"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Gangguan tak terduga di portal (mis. server API sedang dimulai ulang). Pengguna tetap masuk dan bisa mencoba lagi. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-xl">
      <AlertTitle>Halaman tidak dapat dimuat</AlertTitle>
      <AlertDescription>
        <p>Server aplikasi sedang tidak dapat dihubungi atau mengalami gangguan. Coba lagi sebentar lagi.</p>
        {error.digest && (
          <p className="mt-1 text-xs">
            Kode kejadian: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <Button className="mt-3" size="sm" variant="outline" onClick={reset}>
          Coba lagi
        </Button>
      </AlertDescription>
    </Alert>
  );
}
