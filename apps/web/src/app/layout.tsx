import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { PREFERENCES_SCRIPT } from "@/lib/themes";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Elvara School Ecosystem",
    template: "%s · Elvara",
  },
  description: "Platform manajemen sekolah terpadu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="elvara" suppressHydrationWarning className={`${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Tema & status sidebar diterapkan sebelum halaman tampil (tanpa kedipan). */}
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
