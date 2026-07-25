import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/products",
  "/movements",
  "/categories",
  "/suppliers",
  "/warehouses",
  "/scanner",
  "/reports",
  "/audit",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("inv_access") || request.cookies.has("inv_refresh");

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=()");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
