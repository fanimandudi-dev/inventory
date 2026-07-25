import { db } from "@/db";
import { sql } from "drizzle-orm";
import { handleError, ok, requireUser, ApiError } from "@/lib/api";

const QUERIES: Record<string, string> = {
  inventory: `
    select p.sku, p.name, c.name as category, s.name as supplier, w.name as warehouse,
      p.current_stock, p.min_stock, p.max_stock, p.purchase_price, p.selling_price,
      (p.current_stock * p.purchase_price) as stock_value, p.status
    from products p
    left join categories c on c.id = p.category_id
    left join suppliers s on s.id = p.supplier_id
    left join warehouses w on w.id = p.warehouse_id
    where p.deleted_at is null order by p.name`,
  movements: `
    select to_char(m.created_at, 'YYYY-MM-DD HH24:MI') as date, m.type, p.sku, p.name as product,
      m.quantity, m.previous_quantity, m.new_quantity, m.reason, u.full_name as user_name
    from stock_movements m
    join products p on p.id = m.product_id
    left join users u on u.id = m.user_id
    order by m.created_at desc limit 500`,
  "low-stock": `
    select p.sku, p.name, w.name as warehouse, p.current_stock, p.min_stock,
      (p.min_stock - p.current_stock) as shortage, s.name as supplier
    from products p
    left join warehouses w on w.id = p.warehouse_id
    left join suppliers s on s.id = p.supplier_id
    where p.deleted_at is null and p.current_stock <= p.min_stock
    order by (p.min_stock - p.current_stock) desc`,
  valuation: `
    select c.name as category, count(p.id) as products, coalesce(sum(p.current_stock),0) as units,
      coalesce(sum(p.current_stock * p.purchase_price),0) as cost_value,
      coalesce(sum(p.current_stock * p.selling_price),0) as retail_value,
      coalesce(sum(p.current_stock * (p.selling_price - p.purchase_price)),0) as potential_margin
    from categories c
    left join products p on p.category_id = c.id and p.deleted_at is null
    where c.deleted_at is null
    group by c.id order by cost_value desc`,
  performance: `
    select p.sku, p.name,
      count(m.id) as movements,
      coalesce(sum(m.quantity) filter (where m.type in ('IN','RETURN')),0) as units_in,
      coalesce(sum(m.quantity) filter (where m.type in ('OUT','TRANSFER')),0) as units_out,
      p.current_stock
    from products p
    left join stock_movements m on m.product_id = p.id and m.created_at >= now() - interval '90 days'
    where p.deleted_at is null
    group by p.id order by units_out desc limit 100`,
};

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join(
    "\n",
  );
}

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "inventory";
    const format = url.searchParams.get("format") ?? "json";
    const query = QUERIES[type];
    if (!query) throw new ApiError(400, `Unknown report type: ${type}`);

    const result = await db.execute(sql.raw(query));
    const rows = result.rows as Record<string, unknown>[];

    if (format === "csv" || format === "excel") {
      const csv = toCsv(rows);
      const ext = format === "excel" ? "xls" : "csv";
      return new Response(csv, {
        headers: {
          "Content-Type": format === "excel" ? "application/vnd.ms-excel" : "text/csv",
          "Content-Disposition": `attachment; filename="${type}-report.${ext}"`,
        },
      });
    }

    if (format === "pdf") {
      const headers = rows.length ? Object.keys(rows[0]) : [];
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${type} report</title>
        <style>body{font-family:ui-sans-serif,system-ui,sans-serif;margin:28px;color:#0f172a}
        h1{font-size:20px;text-transform:capitalize}
        p{color:#64748b;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
        th{background:#f1f5f9;text-align:left;padding:6px;border:1px solid #e2e8f0;text-transform:capitalize}
        td{padding:6px;border:1px solid #e2e8f0}
        button{position:fixed;top:16px;right:16px;padding:8px 14px;border:0;border-radius:8px;background:#4f46e5;color:#fff;cursor:pointer}
        @media print{button{display:none}}</style></head><body>
        <button onclick="window.print()">Save as PDF</button>
        <h1>${type.replace("-", " ")} report</h1>
        <p>Generated ${new Date().toLocaleString()} · ${rows.length} rows</p>
        <table><thead><tr>${headers.map((h) => `<th>${h.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
        <tbody>${rows
          .map(
            (r) =>
              `<tr>${headers.map((h) => `<td>${r[h] === null ? "" : String(r[h])}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody></table></body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return ok({ type, rows });
  } catch (error) {
    return handleError(error);
  }
}
