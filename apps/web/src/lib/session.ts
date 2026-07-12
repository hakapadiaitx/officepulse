import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function getSession() {
  return getServerSession(authOptions);
}

interface AuthResult {
  session: { user: { tenantId: string; tenantSlug: string; tenantName: string; role: string; id: string } } | null;
  error: NextResponse | null;
}

export async function requireAuth(req?: NextRequest): Promise<AuthResult> {
  // Try NextAuth session first (web)
  const session = await getSession();
  if (session?.user) {
    return { session: session as any, error: null };
  }

  // Fall back to JWT Bearer token (mobile)
  if (req) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any;
        return {
          session: {
            user: {
              id: decoded.sub,
              tenantId: decoded.tenantId,
              tenantSlug: decoded.tenantSlug,
              tenantName: "",
              role: decoded.role,
            },
          },
          error: null,
        };
      } catch {
        // invalid token — fall through to 401
      }
    }
  }

  return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export function getTenantId(session: AuthResult["session"]) {
  return session?.user?.tenantId;
}
