import { createHmac } from "crypto";

export type QrPayload = {
  v: 1;
  id: string;
  sku: string;
  wh: string;
  t: string;
  sig: string;
};

function key() {
  return process.env.QR_SECRET ?? "inventory-qr-secret-change-me-0001";
}

export function checksumFor(input: string) {
  return createHmac("sha256", key()).update(input).digest("hex").slice(0, 16);
}

export function buildQrPayload(product: {
  id: string;
  sku: string;
  qrToken: string;
  warehouseCode?: string | null;
}): QrPayload {
  const base = `${product.id}|${product.sku}|${product.warehouseCode ?? "NA"}|${product.qrToken}`;
  return {
    v: 1,
    id: product.id,
    sku: product.sku,
    wh: product.warehouseCode ?? "NA",
    t: product.qrToken,
    sig: checksumFor(base),
  };
}

export function encodeQr(payload: QrPayload) {
  return JSON.stringify(payload);
}

export function verifyQrPayload(raw: string):
  | { ok: true; payload: QrPayload }
  | { ok: false; error: string; sku?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // allow scanning of plain SKU / barcode strings
    const trimmed = raw.trim();
    if (trimmed.length > 0 && trimmed.length < 64) {
      return { ok: false, error: "PLAIN", sku: trimmed };
    }
    return { ok: false, error: "Unreadable QR payload" };
  }
  const p = parsed as Partial<QrPayload>;
  if (!p || !p.id || !p.sku || !p.sig || !p.t) {
    return { ok: false, error: "Invalid QR structure" };
  }
  const base = `${p.id}|${p.sku}|${p.wh ?? "NA"}|${p.t}`;
  if (checksumFor(base) !== p.sig) {
    return { ok: false, error: "Integrity checksum mismatch" };
  }
  return { ok: true, payload: p as QrPayload };
}
