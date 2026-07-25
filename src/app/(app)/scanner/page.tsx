"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Camera,
  CameraOff,
  Flashlight,
  History,
  Keyboard,
  RefreshCw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { api, type ProductDTO } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SectionTitle,
  StockBadge,
} from "@/components/ui";
import { MovementDialog } from "@/components/dialogs";
import { formatCurrency, relativeTime } from "@/lib/utils";

type ScanEntry = { sku: string; name: string; id: string; at: string };

const REGION_ID = "qr-reader-region";

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [manual, setManual] = useState("");
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUSTMENT" | "COUNT">("IN");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("scan-history");
    if (stored) setHistory(JSON.parse(stored) as ScanEntry[]);
  }, []);

  const pushHistory = useCallback((p: ProductDTO) => {
    setHistory((prev) => {
      const next = [
        { sku: p.sku, name: p.name, id: p.id, at: new Date().toISOString() },
        ...prev.filter((h) => h.id !== p.id),
      ].slice(0, 12);
      localStorage.setItem("scan-history", JSON.stringify(next));
      return next;
    });
  }, []);

  const resolveCode = useCallback(
    async (raw: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const res = await api.post<{ product: ProductDTO; mode: string }>("/api/scan", { raw });
        setProduct(res.product);
        pushHistory(res.product);
        setError(null);
        toast.success(`Matched ${res.product.name}`);
        if (navigator.vibrate) navigator.vibrate(60);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Scan failed";
        setError(message);
        toast.error(message);
      } finally {
        setTimeout(() => {
          busyRef.current = false;
        }, 1200);
      }
    },
    [pushHistory],
  );

  const stop = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {
      /* already stopped */
    }
    scannerRef.current = null;
    setRunning(false);
    setTorchOn(false);
  }, []);

  const start = useCallback(
    async (index = cameraIndex) => {
      try {
        setError(null);
        const { Html5Qrcode } = await import("html5-qrcode");
        const devices = await Html5Qrcode.getCameras();
        if (!devices.length) {
          setError("No camera detected on this device.");
          return;
        }
        setCameras(devices.map((d) => ({ id: d.id, label: d.label || "Camera" })));
        const device = devices[index % devices.length];
        const instance = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = instance;
        await instance.start(
          device.id,
          { fps: 12, qrbox: { width: 250, height: 250 }, aspectRatio: 1.2 },
          (decoded) => {
            void resolveCode(decoded);
          },
          () => {},
        );
        setRunning(true);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Unable to access the camera. Check permissions.";
        setError(message);
        toast.error(message);
        setRunning(false);
      }
    },
    [cameraIndex, resolveCode],
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  async function switchCamera() {
    const next = cameraIndex + 1;
    setCameraIndex(next);
    await stop();
    await start(next);
  }

  async function toggleTorch() {
    try {
      const instance = scannerRef.current as unknown as {
        applyVideoConstraints: (c: MediaTrackConstraints) => Promise<void>;
      } | null;
      if (!instance) return;
      await instance.applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      } as unknown as MediaTrackConstraints);
      setTorchOn((v) => !v);
    } catch {
      toast.error("Flash is not supported on this camera.");
    }
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="QR scanner"
        subtitle="Point the camera at a StockFlow label to open instant stock actions"
        action={<Badge tone="brand"><ShieldCheck className="h-3 w-3" /> HMAC verified</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="scanner-frame bg-surface-2 relative overflow-hidden rounded-2xl">
            <div id={REGION_ID} className="min-h-[280px] w-full" />
            {!running ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <ScanLine className="text-muted h-8 w-8" />
                <p className="text-muted max-w-xs text-sm">
                  Camera is idle. Start scanning to detect QR codes continuously.
                </p>
                <Button onClick={() => start()}>
                  <Camera className="h-4 w-4" /> Start camera
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {running ? (
              <Button variant="outline" onClick={stop}>
                <CameraOff className="h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button onClick={() => start()}>
                <Camera className="h-4 w-4" /> Start
              </Button>
            )}
            <Button variant="outline" onClick={switchCamera} disabled={cameras.length < 2}>
              <RefreshCw className="h-4 w-4" /> Switch camera
            </Button>
            <Button variant={torchOn ? "primary" : "outline"} onClick={toggleTorch} disabled={!running}>
              <Flashlight className="h-4 w-4" /> Flash
            </Button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

          <div className="border-line mt-5 border-t pt-4">
            <p className="text-muted mb-2 flex items-center gap-2 text-xs font-semibold uppercase">
              <Keyboard className="h-3 w-3" /> Manual entry (offline friendly)
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) void resolveCode(manual.trim());
              }}
            >
              <Input
                placeholder="Type a SKU or paste QR payload"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <Button type="submit">Lookup</Button>
            </form>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Scan result" subtitle="Quick actions available immediately" />
            {product ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${product.id}`} className="font-semibold hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-muted font-mono text-xs">{product.sku}</p>
                    <p className="text-muted mt-1 text-xs">
                      {product.warehouseName ?? "Unassigned"} · {product.locationLabel ?? "no bin"}
                    </p>
                  </div>
                  <StockBadge stock={product.currentStock} min={product.minStock} />
                </div>

                <div className="bg-surface-2 grid grid-cols-3 gap-2 rounded-xl p-3 text-center text-sm">
                  <div>
                    <p className="text-muted text-xs">On hand</p>
                    <p className="font-semibold">{product.currentStock}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">Reserved</p>
                    <p className="font-semibold">{product.reservedStock}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">Value</p>
                    <p className="font-semibold">
                      {formatCurrency(Number(product.purchasePrice) * product.currentStock)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["IN", "Stock in"],
                      ["OUT", "Stock out"],
                      ["ADJUSTMENT", "Adjustment"],
                      ["COUNT", "Inventory count"],
                    ] as const
                  ).map(([type, label]) => (
                    <Button
                      key={type}
                      variant={type === "IN" ? "primary" : "outline"}
                      onClick={() => {
                        setMovementType(type);
                        setMovementOpen(true);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<ScanLine className="h-5 w-5" />}
                title="Nothing scanned yet"
                description="Scanned products appear here with instant stock actions."
              />
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Scan history" subtitle="Stored locally on this device" />
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-muted flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" /> No scans yet.
                </p>
              ) : (
                history.map((h) => (
                  <Link
                    key={`${h.id}-${h.at}`}
                    href={`/products/${h.id}`}
                    className="border-line hover:bg-surface-2 flex items-center justify-between rounded-xl border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-muted font-mono text-xs">{h.sku}</p>
                    </div>
                    <span className="text-muted text-xs">{relativeTime(h.at)}</span>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <MovementDialog
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        product={product}
        defaultType={movementType}
      />
    </div>
  );
}
