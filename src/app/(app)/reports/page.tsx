"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart, FileSpreadsheet, Printer } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Card, SectionTitle, Skeleton, TableShell } from "@/components/ui";

const REPORTS = [
  { id: "inventory", label: "Inventory", desc: "Full catalogue with valuation per SKU" },
  { id: "movements", label: "Stock movements", desc: "Last 500 movements with users" },
  { id: "low-stock", label: "Low stock", desc: "Items at or below minimum level" },
  { id: "valuation", label: "Inventory valuation", desc: "Cost, retail and margin by category" },
  { id: "performance", label: "Product performance", desc: "90-day in/out throughput" },
];

export default function ReportsPage() {
  const [type, setType] = useState("inventory");

  const { data, isLoading } = useQuery({
    queryKey: ["report", type],
    queryFn: () => api.get<{ rows: Record<string, unknown>[] }>(`/api/reports?type=${type}`),
  });

  const rows = data?.rows ?? [];
  const headers = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Reports"
        subtitle="Operational and financial exports in CSV, Excel and PDF"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/reports?type=${type}&format=csv`, "_blank")}
            >
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/api/reports?type=${type}&format=excel`, "_blank")}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button onClick={() => window.open(`/api/reports?type=${type}&format=pdf`, "_blank")}>
              <Printer className="h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {REPORTS.map((r) => (
          <button key={r.id} onClick={() => setType(r.id)} className="text-left">
            <Card
              className={`h-full p-4 transition ${
                type === r.id ? "ring-2 ring-indigo-500" : "hover:bg-surface-2"
              }`}
            >
              <FileBarChart className="text-brand mb-2 h-4 w-4" />
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-muted mt-1 text-xs">{r.desc}</p>
            </Card>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <TableShell>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="surface-2 text-muted text-xs uppercase">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 text-left whitespace-nowrap">
                    {h.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-line border-t">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2 whitespace-nowrap">
                      {row[h] === null || row[h] === undefined ? "—" : String(row[h])}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="text-muted px-4 py-12 text-center" colSpan={headers.length || 1}>
                    No data for this report.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableShell>
      )}
      {rows.length > 100 ? (
        <p className="text-muted text-xs">
          Showing the first 100 rows of {rows.length}. Export for the full dataset.
        </p>
      ) : null}
    </div>
  );
}
