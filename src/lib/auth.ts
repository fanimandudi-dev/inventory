import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

export const ACCESS_COOKIE = "inv_access";
export const REFRESH_COOKIE = "inv_refresh";

const ACCESS_TTL_SECONDS = 60 * 60; // 1h
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | "AUDITOR";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
};

function secret() {
  const value = process.env.JWT_SECRET ?? "inventory-dev-secret-change-me-please-0001";
  return new TextEncoder().encode(value);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyAccessToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      fullName: String(payload.fullName),
      role: payload.role as Role,
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionForUser(userId: string) {
  const hdrs = await headers();
  const raw = randomBytes(48).toString("hex");
  await db.insert(sessions).values({
    userId,
    refreshTokenHash: hashToken(raw),
    userAgent: hdrs.get("user-agent") ?? null,
    ipAddress:
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null,
    expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
  });
  return raw;
}

export async function setAuthCookies(user: SessionUser, refreshToken: string) {
  const jar = await cookies();
  const accessToken = await signAccessToken(user);
  const secure = process.env.NODE_ENV === "production";
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (token) {
    const user = await verifyAccessToken(token);
    if (user) return user;
  }
  // fall back to refresh token (server components cannot always write cookies)
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
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
  if (!found) return null;
  return { ...found, role: found.role as Role };
}

export async function revokeSession(refreshToken: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.refreshTokenHash, hashToken(refreshToken)));
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  MANAGER: "Inventory Manager",
  EMPLOYEE: "Employee",
  AUDITOR: "Auditor (read-only)",
};

export function canWrite(role: Role) {
  return role === "ADMIN" || role === "MANAGER" || role === "EMPLOYEE";
}

export function canManage(role: Role) {
  return role === "ADMIN" || role === "MANAGER";
}
