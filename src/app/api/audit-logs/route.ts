import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { and, count, desc, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import { handleError, ok, pagination, requireUser } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const { page, limit, offset } = pagination(url);
    const clauses: SQL[] = [];
    const action = url.searchParams.get("action");
    const entity = url.searchParams.get("entity");
    const search = url.searchParams.get("search");
    const since = url.searchParams.get("since");
    if (action) clauses.push(eq(auditLogs.action, action));
    if (entity) clauses.push(eq(auditLogs.entity, entity));
    if (since) clauses.push(gte(auditLogs.createdAt, new Date(since)));
    if (search) {
      const term = `%${search}%`;
      const s = or(
        ilike(auditLogs.action, term),
        ilike(auditLogs.entity, term),
        ilike(users.fullName, term),
        ilike(auditLogs.ipAddress, term),
      );
      if (s) clauses.push(s);
    }
    const where = clauses.length ? and(...clauses) : undefined;

    const items = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        beforeValue: auditLogs.beforeValue,
        afterValue: auditLogs.afterValue,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userName: users.fullName,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalRows = await db
      .select({ value: count() })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(where);
    const total = Number(totalRows[0]?.value ?? 0);

    return ok({
      items,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleError(error);
  }
}
