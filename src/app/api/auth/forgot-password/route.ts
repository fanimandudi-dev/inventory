import { handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const hdrs = await headers();
    rateLimit(`forgot:${hdrs.get("x-forwarded-for") ?? "local"}`, 5, 60_000);
    const body = await parseBody(request, forgotPasswordSchema);
    // In production this enqueues a BullMQ job that sends a reset email.
    return ok({
      message: `If an account exists for ${body.email}, a reset link has been sent.`,
    });
  } catch (error) {
    return handleError(error);
  }
}
