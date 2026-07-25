import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  createSessionForUser,
  setAuthCookies,
  verifyPassword,
  type Role,
} from "@/lib/auth";
import { handleError, ok, parseBody, ApiError, recordAudit, rateLimit } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    rateLimit(`login:${hdrs.get("x-forwarded-for") ?? "local"}`, 12, 60_000);
    const body = await parseBody(request, loginSchema);
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.email, body.email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);
    const user = rows[0];
    if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password");
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid email or password");

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      avatarUrl: user.avatarUrl,
    };
    const refresh = await createSessionForUser(user.id);
    await setAuthCookies(sessionUser, refresh);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await recordAudit({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
    });
    return ok({ user: sessionUser });
  } catch (error) {
    return handleError(error);
  }
}
