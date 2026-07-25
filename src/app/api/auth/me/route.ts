import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { handleError, ok, parseBody, requireUser, recordAudit, ApiError } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  try {
    const current = await requireUser();
    const rows = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
    const user = rows[0];
    if (!user) throw new ApiError(404, "User not found");
    const activeSessions = await db
      .select({
        id: sessions.id,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, current.id), isNull(sessions.revokedAt)))
      .orderBy(desc(sessions.createdAt))
      .limit(10);
    return ok({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        jobTitle: user.jobTitle,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      sessions: activeSessions,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const current = await requireUser();
    const body = await parseBody(request, profileSchema);
    const rows = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
    const user = rows[0];
    if (!user) throw new ApiError(404, "User not found");

    const update: Record<string, unknown> = {
      fullName: body.fullName,
      phone: body.phone ?? null,
      jobTitle: body.jobTitle ?? null,
      updatedAt: new Date(),
    };

    if (body.newPassword) {
      if (!body.currentPassword) throw new ApiError(400, "Current password is required");
      const valid = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!valid) throw new ApiError(400, "Current password is incorrect");
      update.passwordHash = await hashPassword(body.newPassword);
    }

    await db.update(users).set(update).where(eq(users.id, current.id));
    await recordAudit({
      userId: current.id,
      action: "UPDATE",
      entity: "Profile",
      entityId: current.id,
      before: { fullName: user.fullName, phone: user.phone, jobTitle: user.jobTitle },
      after: { fullName: body.fullName, phone: body.phone, jobTitle: body.jobTitle },
    });
    return ok({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
