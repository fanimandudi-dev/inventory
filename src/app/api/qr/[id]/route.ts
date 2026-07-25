import QRCode from "qrcode";
import { db } from "@/db";
import { qrLabels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError, handleError, ok, requireUser } from "@/lib/api";
import { buildQrPayload, encodeQr } from "@/lib/qr";
import { getProductById } from "@/server/products";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await ctx.params;
    const product = await getProductById(id);
    if (!product) throw new ApiError(404, "Product not found");
    const payload = buildQrPayload({
      id: product.id,
      sku: product.sku,
      qrToken: product.qrToken,
      warehouseCode: product.warehouseCode,
    });
    const encoded = encodeQr(payload);
    const url = new URL(request.url);

    if (url.searchParams.get("format") === "png") {
      const buffer = await QRCode.toBuffer(encoded, {
        width: 640,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      await db
        .update(qrLabels)
        .set({ printedCount: 1, lastPrintedAt: new Date() })
        .where(eq(qrLabels.productId, product.id));
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${product.sku}-qr.png"`,
        },
      });
    }

    const dataUrl = await QRCode.toDataURL(encoded, { width: 400, margin: 1 });
    return ok({ payload, encoded, dataUrl, product });
  } catch (error) {
    return handleError(error);
  }
}
