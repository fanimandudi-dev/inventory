import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Boxes, QrCode, ShieldCheck, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <Boxes className="h-5 w-5" />
          </div>
          StockFlow
        </div>
        <div className="relative space-y-8">
          <h1 className="text-4xl leading-tight font-semibold">
            Inventory operations,
            <br />
            scanned and settled in seconds.
          </h1>
          <p className="max-w-md text-slate-300">
            Signed QR labels, multi-warehouse stock control, live analytics and a complete audit
            trail — built for warehouse teams working on the floor.
          </p>
          <div className="grid max-w-md gap-4 sm:grid-cols-3">
            {[
              { icon: QrCode, label: "Signed QR labels" },
              { icon: TrendingUp, label: "Live analytics" },
              { icon: ShieldCheck, label: "RBAC + audit" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Icon className="mb-2 h-5 w-5 text-indigo-300" />
                <p className="text-sm text-slate-200">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} StockFlow Systems · SOC2-ready architecture
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <LoginForm />
      </div>
    </main>
  );
}
