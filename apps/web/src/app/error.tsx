"use client";

import PortalError from "./(portal)/error";

/** Menangkap gangguan di layout segmen (mis. menu portal) yang tidak tertangkap error boundary halaman. */
export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12">
      <PortalError {...props} />
    </main>
  );
}
