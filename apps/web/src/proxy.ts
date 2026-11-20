import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@smart-school/contracts";

/**
 * Pemeriksaan optimistis: halaman portal tanpa cookie sesi langsung diarahkan ke /login.
 * Validasi sesi dan izin yang sebenarnya tetap dilakukan API pada setiap permintaan.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/guardian/:path*", "/me/:path*"],
};
