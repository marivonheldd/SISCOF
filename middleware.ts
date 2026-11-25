import { NextResponse, type NextRequest } from "next/server";
import { lerToken, SESSION_COOKIE } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessao = await lerToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") return NextResponse.next();

  if (!sessao) {
    const url = new URL("/login", req.url);
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
