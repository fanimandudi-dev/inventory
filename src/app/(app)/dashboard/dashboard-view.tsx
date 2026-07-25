"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Layers,
  PackageX,
  Tags,
  Warehouse,
  Wallet,
  Activity,
} from "lucide-react";
import { api } from "@/lib/client";
import { Badge, Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { formatCurrency, formatNumber, relativeTime } from "@/lib/utils";

type Dashboard = {
  kpi: {
    totalProducts: number;
    totalValue: number;
    retailValue: number;
    totalUnits: number;
    lowStock: number;
    outOfStock: number;
    categories: number;
    warehouses: number;
    suppliers: number;
    movementsToday: number;
    stockInToday: number;
    stockOutToday: number;
  };
  movementSeries: { day: string; stockIn: number; stockOut: number }[];
  valueSeries: { day: string; value: number }[];
  categoryDistribution: { name: string; color: string; products: number; value: number }[];
  topMoved: { name: string; sku: string; moves: number; units: number }[];
  recentActivity: {
    id: string;
    type: string;
    quantity: number;
    new_quantity: number;
    created_at: string;
    product_name: string;
    sku: string;
    user_name: string | null;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    sku: string;
    current_stock: number;
    min_stock: number;
    unit: string;
  }[];
  warehouseBreakdown: { name: string; units: number; value: number }[];
};

const chartTooltip = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--ink)",
  },
};

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<Dashboard>("/api/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const k = data.kpi;
  const kpis = [
    {
      label: "Inventory value",
      value: formatCurrency(k.totalValue),
      hint: `${formatCurrency(k.retailValue)} retail`,
      icon: Wallet,
      tone: "brand" as const,
    },
    {
      label: "Total products",
      value: formatNumber(k.totalProducts),
      hint: `${formatNumber(k.totalUnits)} units on hand`,
      icon: Boxes,
      tone: "info" as const,
    },
    {
      label: "Categories",
      value: formatNumber(k.categories),
      hint: `${k.suppliers} suppliers`,
      icon: Tags,
      tone: "neutral" as const,
    },
    {
      label: "Warehouses",
      value: formatNumber(k.warehouses),
      hint: "Multi-site tracking",
      icon: Warehouse,
      tone: "neutral" as const,
    },
    {
      label: "Low stock",
      value: formatNumber(k.lowStock),
      hint: "At or below minimum",
      icon: AlertTriangle,
      tone: "warning" as const,
    },
    {
      label: "Out of stock",
      value: formatNumber(k.outOfStock),
      hint: "Requires replenishment",
      icon: PackageX,
      tone: "danger" as const,
    },
    {
      label: "Movements today",
      value: formatNumber(k.movementsToday),
      hint: `${k.stockInToday} in · ${k.stockOutToday} out`,
      icon: Activity,
      tone: "success" as const,
    },
    {
      label: "Net flow today",
      value: formatNumber(k.stockInToday - k.stockOutToday),
      hint: "Units in minus out",
      icon: k.stockInToday >= k.stockOutToday ? ArrowUpRight : ArrowDownRight,
      tone: "brand" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Operations dashboard"
        subtitle="Live inventory KPIs across every warehouse, refreshed on each visit."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted text-xs font-medium tracking-wide uppercase">
                  {kpi.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{kpi.value}</p>
                <p className="text-muted mt-1 text-xs">{kpi.hint}</p>
              </div>
              <Badge tone={kpi.tone} className="h-8 w-8 justify-center rounded-xl p-0">
                <kpi.icon className="h-4 w-4" />
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Stock in vs stock out" subtitle="Units moved over the last 30 days" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.movementSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="var(--muted)"
                  fontSize={11}
                />
                <YAxis stroke="var(--muted)" fontSize={11} />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="stockIn" name="Stock in" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stockOut" name="Stock out" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Category mix" subtitle="Stock value by category" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {data.categoryDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  {...chartTooltip}
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Inventory value evolution"
            subtitle="Reconstructed valuation over the last 30 days"
          />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.valueSeries}>
                <defs>
                  <linearGradient id="value" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="var(--muted)"
                  fontSize={11}
                />
                <YAxis
                  stroke="var(--muted)"
                  fontSize={11}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  {...chartTooltip}
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#value)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Most moved products" subtitle="Units moved · last 30 days" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topMoved} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="sku"
                  stroke="var(--muted)"
                  fontSize={10}
                  width={80}
                />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="units" name="Units" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Recent activity" subtitle="Latest stock movements" />
          <div className="mt-4 space-y-2">
            {data.recentActivity.length === 0 ? (
              <EmptyState icon={<Activity className="h-5 w-5" />} title="No movements yet" />
            ) : (
              data.recentActivity.map((m) => (
                <div
                  key={m.id}
                  className="border-line flex items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.product_name}</p>
                    <p className="text-muted text-xs">
                      {m.sku} · {m.user_name ?? "System"} · {relativeTime(m.created_at)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      m.type === "IN" || m.type === "RETURN"
                        ? "success"
                        : m.type === "OUT" || m.type === "TRANSFER"
                          ? "danger"
                          : "info"
                    }
                  >
                    {m.type} {m.quantity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Replenish soon" subtitle="Lowest stock coverage" />
            <div className="mt-4 space-y-2">
              {data.lowStockProducts.length === 0 ? (
                <p className="text-muted text-sm">Everything is above minimum levels.</p>
              ) : (
                data.lowStockProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="border-line hover:bg-surface-2 flex items-center justify-between rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-muted text-xs">{p.sku}</p>
                    </div>
                    <Badge tone={p.current_stock <= 0 ? "danger" : "warning"}>
                      {p.current_stock}/{p.min_stock}
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Warehouse load" subtitle="Units and value per site" />
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.warehouseBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} />
                  <YAxis stroke="var(--muted)" fontSize={10} />
                  <Tooltip {...chartTooltip} />
                  <Line
                    type="monotone"
                    dataKey="units"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Quick links"
          subtitle="Jump straight into the most used operations"
          action={<Layers className="text-muted h-4 w-4" />}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/scanner", label: "Scan a QR code", desc: "Camera-first stock actions" },
            { href: "/products", label: "Manage products", desc: "Catalogue and QR labels" },
            { href: "/movements", label: "Record movement", desc: "In, out, adjust, transfer" },
            { href: "/reports", label: "Export reports", desc: "CSV, Excel and PDF" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-line hover:bg-surface-2 rounded-xl border p-4 transition"
            >
              <p className="text-sm font-medium">{link.label}</p>
              <p className="text-muted mt-1 text-xs">{link.desc}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
