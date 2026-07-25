import { z } from "zod";
import { handleError, ok, parseBody, recordAudit, requireUser, ApiError } from "@/lib/api";
import { verifyQrPayload } from "@/lib/qr";
import { getProductById, getProductBySku } from "@/server/products";

const scanSchema = z.object({ raw: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { raw } = await parseBody(request, scanSchema);
    const verified = verifyQrPayload(raw);

    let product = null;
    let mode: "signed" | "plain" = "signed";

    if (verified.ok) {
      product = await getProductById(verified.payload.id);
      if (product && product.sku !== verified.payload.sku) {
        throw new ApiError(409, "QR code does not match product SKU");
      }
    } else if (verified.error === "PLAIN" && verified.sku) {
      mode = "plain";
      product = await getProductBySku(verified.sku.toUpperCase());
    } else {
      throw new ApiError(400, verified.error);
    }

    if (!product) throw new ApiError(404, "No product matches this code");

    await recordAudit({
      userId: user.id,
      action: "SCAN",
      entity: "Product",
      entityId: product.id,
      after: { mode, sku: product.sku },
    });

    return ok({ product, mode });
  } catch (error) {
    return handleError(error);
  }
}
