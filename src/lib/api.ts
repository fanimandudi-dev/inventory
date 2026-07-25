import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError, type ZodType } from "zod";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getCurrentUser, type Role, type SessionUser } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ success: false, error: { message, details } }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) return fail(error.status, error.message, error.details);
  if (error instanceof ZodError) {
    return fail(422, "Validation failed", error.issues);
  }
  console.error(error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return fail(500, message);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required");
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  return user;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

export function pagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const rawLimit = Number(url.searchParams.get("limit") ?? 20) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export async function recordAudit(input: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const hdrs = await headers();
    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      beforeValue: (input.before as object) ?? null,
      afterValue: (input.after as object) ?? null,
      ipAddress:
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        hdrs.get("x-real-ip") ??
        "127.0.0.1",
      userAgent: hdrs.get("user-agent") ?? null,
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new ApiError(429, "Too many requests, please slow down");
  }
}
