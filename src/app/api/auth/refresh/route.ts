import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  REFRESH_COOKIE,
  hashToken,
  setAuthCookies,
  createSessionForUser,
  revokeSession,
  type Role,
} from "@/lib/auth";
import { ApiError, handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    const jar = await cookies();
    const refresh = jar.get(REFRESH_COOKIE)?.value;
    if (!refresh) throw new ApiError(401, "Missing refresh token");
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        avatarUrl: users.avatarUrl,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.refreshTokenHash, hashToken(refresh)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const found = rows[0];
    if (!found) throw new ApiError(401, "Session expired, please sign in again");
    await revokeSession(refresh);
    const next = await createSessionForUser(found.id);
    const sessionUser = { ...found, role: found.role as Role };
    await setAuthCookies(sessionUser, next);
    return ok({ user: sessionUser });
  } catch (error) {
    return handleError(error);
  }
}
