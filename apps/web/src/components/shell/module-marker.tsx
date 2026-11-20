import type { ModuleKey } from "@/lib/modules";

/**
 * Penanda modul untuk sebuah segmen route. CSS `#konten:has([data-module=...])` memakai penanda ini
 * untuk mewarnai area konten (tanpa JavaScript, sehingga tidak memblokir prerender maupun berkedip).
 * Segmen yang lebih dalam menimpa warna segmen induknya.
 */
export function ModuleMarker({ module }: { module: ModuleKey }) {
  return <span hidden data-module={module} />;
}

export function moduleLayout(module: ModuleKey) {
  return function ModuleLayout({ children }: { children: React.ReactNode }) {
    return (
      <>
        <ModuleMarker module={module} />
        {children}
      </>
    );
  };
}
