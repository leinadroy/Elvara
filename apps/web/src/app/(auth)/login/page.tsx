import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/page-states";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

/** Hanya path internal yang boleh menjadi tujuan setelah login (mencegah open redirect). */
function safeNext(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

async function LoginWithNext({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  return <LoginForm next={safeNext(sp.next)} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Masuk ke Smart School</CardTitle>
          <CardDescription>Gunakan email dan kata sandi akun sekolah Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Fallback sengaja bukan form: isian di form sementara akan hilang saat konten asli tiba. */}
          <Suspense fallback={<LoadingBlock rows={3} label="Menyiapkan formulir…" />}>
            <LoginWithNext searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
