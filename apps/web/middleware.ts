import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  const auth = request.headers.get("authorization");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.next();
  }

  if (!auth?.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="CookUnity SEO Agent"' },
    });
  }

  const decoded = Buffer.from(auth.replace("Basic ", ""), "base64").toString();
  const [email, password] = decoded.split(":");
  if (email === adminEmail && password === adminPassword) {
    return NextResponse.next();
  }

  return new NextResponse("Invalid credentials", { status: 401 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
