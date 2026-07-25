import QRCode from "qrcode";
import { db } from "@/db";
import { products, warehouses } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { handleError, requireUser } from "@/lib/api";
import { buildQrPayload, encodeQr } from "@/lib/qr";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        qrToken: products.qrToken,
        unit: products.unit,
        price: products.sellingPrice,
        warehouseCode: warehouses.code,
        warehouseName: warehouses.name,
      })
      .from(products)
      .leftJoin(warehouses, eq(warehouses.id, products.warehouseId))
      .where(
        ids.length
          ? and(isNull(products.deletedAt), inArray(products.id, ids))
          : isNull(products.deletedAt),
      )
      .limit(120);

    const cards = await Promise.all(
      rows.map(async (p) => {
        const encoded = encodeQr(buildQrPayload(p));
        const dataUrl = await QRCode.toDataURL(encoded, { width: 240, margin: 1 });
        return `<div class="label">
          <img src="${dataUrl}" alt="${escapeHtml(p.sku)}" />
          <div class="meta">
            <strong>${escapeHtml(p.name)}</strong>
            <span class="sku">${escapeHtml(p.sku)}</span>
            <span>${escapeHtml(p.warehouseName ?? "Unassigned")} · ${escapeHtml(p.warehouseCode ?? "NA")}</span>
          </div>
        </div>`;
      }),
    );

    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>QR labels (${rows.length})</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;margin:24px;background:#fff;color:#0f172a}
        h1{font-size:18px;margin:0 0 4px}
        p{color:#64748b;font-size:12px;margin:0 0 20px}
        .sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .label{border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;gap:10px;align-items:center;page-break-inside:avoid}
        .label img{width:88px;height:88px}
        .meta{display:flex;flex-direction:column;font-size:11px;gap:2px;overflow:hidden}
        .meta strong{font-size:12px}
        .sku{font-family:ui-monospace,monospace;color:#4f46e5}
        button{position:fixed;top:16px;right:16px;padding:8px 14px;border-radius:8px;border:0;background:#4f46e5;color:#fff;font-weight:600;cursor:pointer}
        @media print{button{display:none}}
      </style></head>
      <body>
        <button onclick="window.print()">Print / Save as PDF</button>
        <h1>Inventory QR label sheet</h1>
        <p>${rows.length} signed labels · generated ${new Date().toLocaleString()}</p>
        <div class="sheet">${cards.join("")}</div>
      </body></html>`;

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    return handleError(error);
  }
}
