"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Search, ShieldCheck } from "lucide-react";
import { api, type Paged } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SectionTitle,
  Select,
  Skeleton,
  TableShell,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  beforeValue: unknown;
  afterValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

function browserFrom(ua: string | null) {
  if (!ua) return "—";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return "Other";
}

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(search ? { search } : {}),
    ...(entity ? { entity } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit", params.toString()],
    queryFn: () => api.get<Paged<AuditRow>>(`/api/audit-logs?${params.toString()}`),
  });

  function exportCsv() {
    const rows = data?.items ?? [];
    const headers = ["createdAt", "userName", "action", "entity", "ipAddress", "userAgent"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String((r as unknown as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Audit log"
        subtitle="Immutable trail of every action, with before/after values"
        action={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export page
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="text-muted pointer-events-none absolute top-2.5 left-3 h-4 w-4" />
            <Input
              className="pl-9"
              placeholder="Search action, user, IP…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All entities</option>
            {["Product", "Category", "Supplier", "Warehouse", "StockMovement", "User", "Profile"].map(
              (e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ),
            )}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No audit entries" />
        </Card>
      ) : (
        <TableShell>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="surface-2 text-muted text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Entity</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">Browser</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) => (
                <tr key={row.id} className="border-line hover:bg-surface-2 border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.userName ?? "System"}</p>
                    <p className="text-muted text-xs">{row.userEmail ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        row.action.startsWith("DELETE")
                          ? "danger"
                          : row.action.startsWith("CREATE")
                            ? "success"
                            : row.action.startsWith("STOCK")
                              ? "info"
                              : "neutral"
                      }
                    >
                      {row.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{row.entity}</td>
                  <td className="text-muted px-4 py-3 font-mono text-xs">{row.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3">{browserFrom(row.userAgent)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      {data ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted">
            {data.meta.total} entries · page {data.meta.page}/{data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <Card className="max-h-[80vh] w-full max-w-2xl overflow-y-auto p-5">
            <SectionTitle
              title={`${selected.action} · ${selected.entity}`}
              subtitle={formatDateTime(selected.createdAt)}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted mb-1 text-xs uppercase">Before</p>
                <pre className="bg-surface-2 overflow-x-auto rounded-xl p-3 text-xs">
                  {JSON.stringify(selected.beforeValue ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-muted mb-1 text-xs uppercase">After</p>
                <pre className="bg-surface-2 overflow-x-auto rounded-xl p-3 text-xs">
                  {JSON.stringify(selected.afterValue ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <p className="text-muted mt-4 text-xs">
              {selected.ipAddress} · {selected.userAgent}
            </p>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
