"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Tags,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { Badge, Button } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { group: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Operations",
    items: [
      { href: "/scanner", label: "QR Scanner", icon: QrCode },
      { href: "/products", label: "Products", icon: Package },
      { href: "/movements", label: "Stock Movements", icon: ClipboardList },
    ],
  },
  {
    group: "Master data",
    items: [
      { href: "/categories", label: "Categories", icon: Tags },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
      { href: "/warehouses", label: "Warehouses", icon: Warehouse },
    ],
  },
  {
    group: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/audit", label: "Audit Log", icon: ShieldCheck },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type SearchResults = {
  products: { id: string; name: string; sku: string; currentStock: number }[];
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string; code: string }[];
};

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSidebarOpen(false), [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: NotificationDTO[]; unread: number }>("/api/notifications"),
    refetchInterval: 60_000,
  });

  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: paletteOpen && query.trim().length > 0,
  });

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      label: part.replace(/-/g, " "),
      href: "/" + parts.slice(0, index + 1).join("/"),
    }));
  }, [pathname]);

  async function logout() {
    await api.post("/api/auth/logout");
    toast.success("Signed out");
    router.replace("/login");
    router.refresh();
  }

  const unread = notifications.data?.unread ?? 0;

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-surface border-line fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-line flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="bg-brand flex h-8 w-8 items-center justify-center rounded-lg text-white">
              <Boxes className="h-4 w-4" />
            </span>
            StockFlow
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="text-muted px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase">
                {section.group}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                        active
                          ? "bg-brand-soft text-brand font-medium"
                          : "text-muted hover:bg-surface-2 hover:text-[color:var(--ink)]",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-line border-t p-3">
          <div className="bg-surface-2 flex items-center gap-3 rounded-xl p-3">
            <div className="bg-brand flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white">
              {user.fullName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.fullName}</p>
              <p className="text-muted truncate text-xs">{user.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="bg-surface/80 border-line sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <nav className="text-muted hidden items-center gap-1 text-sm sm:flex">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                <Link
                  href={c.href}
                  className={cn(
                    "capitalize",
                    i === crumbs.length - 1 && "text-[color:var(--ink)] font-medium",
                  )}
                >
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          <button
            onClick={() => setPaletteOpen(true)}
            className="surface text-muted hover:bg-surface-2 hidden items-center gap-2 rounded-xl px-3 py-2 text-sm md:flex"
          >
            <Search className="h-4 w-4" />
            Search products, SKU…
            <kbd className="bg-surface-2 ml-6 rounded px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setNotifOpen((v) => !v)}>
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </Button>
            {notifOpen ? (
              <div className="surface shadow-card absolute right-0 z-30 mt-2 w-80 rounded-2xl">
                <div className="border-line flex items-center justify-between border-b p-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <button
                    className="text-brand text-xs"
                    onClick={async () => {
                      await api.patch("/api/notifications");
                      queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {(notifications.data?.items ?? []).length === 0 ? (
                    <p className="text-muted p-6 text-center text-sm">You&apos;re all caught up.</p>
                  ) : (
                    notifications.data?.items.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "border-line hover:bg-surface-2 border-b p-3 last:border-0",
                          !n.isRead && "bg-brand-soft/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{n.title}</p>
                          <Badge
                            tone={
                              n.type === "OUT_OF_STOCK"
                                ? "danger"
                                : n.type === "LOW_STOCK"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {n.type.replace("_", " ").toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-muted mt-1 text-xs">{n.message}</p>
                        <p className="text-muted mt-1 text-[10px]">{relativeTime(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Command palette */}
      {paletteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-24 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPaletteOpen(false);
          }}
        >
          <div className="surface shadow-card w-full max-w-xl overflow-hidden rounded-2xl">
            <div className="border-line flex items-center gap-2 border-b px-4">
              <Search className="text-muted h-4 w-4" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, SKUs, categories, warehouses…"
                className="w-full bg-transparent py-4 text-sm outline-none"
              />
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {query.trim().length === 0 ? (
                <div className="space-y-1">
                  {NAV.flatMap((s) => s.items).map((item) => (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setPaletteOpen(false);
                      }}
                      className="hover:bg-surface-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm"
                    >
                      <item.icon className="text-muted h-4 w-4" />
                      Go to {item.label}
                    </button>
                  ))}
                </div>
              ) : search.isLoading ? (
                <p className="text-muted p-4 text-sm">Searching…</p>
              ) : (
                <div className="space-y-3">
                  {(search.data?.products.length ?? 0) > 0 ? (
                    <div>
                      <p className="text-muted px-3 py-1 text-[10px] font-semibold uppercase">
                        Products
                      </p>
                      {search.data?.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            router.push(`/products/${p.id}`);
                            setPaletteOpen(false);
                          }}
                          className="hover:bg-surface-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm"
                        >
                          <span>{p.name}</span>
                          <span className="text-muted font-mono text-xs">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {(search.data?.warehouses.length ?? 0) > 0 ? (
                    <div>
                      <p className="text-muted px-3 py-1 text-[10px] font-semibold uppercase">
                        Warehouses
                      </p>
                      {search.data?.warehouses.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => {
                            router.push("/warehouses");
                            setPaletteOpen(false);
                          }}
                          className="hover:bg-surface-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm"
                        >
                          {w.name}
                          <span className="text-muted text-xs">{w.code}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {search.data &&
                  search.data.products.length === 0 &&
                  search.data.warehouses.length === 0 &&
                  search.data.categories.length === 0 &&
                  search.data.suppliers.length === 0 ? (
                    <p className="text-muted p-4 text-sm">No results for “{query}”.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
