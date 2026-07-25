import { cookies } from "next/headers";
import { clearAuthCookies, getCurrentUser, REFRESH_COOKIE, revokeSession } from "@/lib/auth";
import { handleError, ok, recordAudit } from "@/lib/api";

export async function POST() {
  try {
    const jar = await cookies();
    const user = await getCurrentUser();
    const refresh = jar.get(REFRESH_COOKIE)?.value;
    if (refresh) await revokeSession(refresh);
    await clearAuthCookies();
    if (user) {
      await recordAudit({
        userId: user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: user.id,
      });
    }
    return ok({ loggedOut: true });
  } catch (error) {
    return handleError(error);
  }
}
