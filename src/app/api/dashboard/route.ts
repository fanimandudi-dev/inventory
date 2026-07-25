import { db } from "@/db";
import { handleError, ok, requireUser } from "@/lib/api";
import { sql } from "drizzle-orm";

type Row = Record<string, unknown>;

async function raw<T = Row>(query: string): Promise<T[]> {
  const result = await db.execute(sql.raw(query));
  return result.rows as T[];
}

export async function GET() {
  try {
    await requireUser();

    const [kpi] = await raw<{
      total_products: string;
      total_value: string;
      retail_value: string;
      low_stock: string;
      out_of_stock: string;
      total_units: string;
    }>(`
      select
        count(*)::text as total_products,
        coalesce(sum(current_stock * purchase_price), 0)::text as total_value,
        coalesce(sum(current_stock * selling_price), 0)::text as retail_value,
        count(*) filter (where current_stock > 0 and current_stock <= min_stock)::text as low_stock,
        count(*) filter (where current_stock <= 0)::text as out_of_stock,
        coalesce(sum(current_stock), 0)::text as total_units
      from products where deleted_at is null
    `);

    const [counts] = await raw<{ categories: string; warehouses: string; suppliers: string }>(`
      select
        (select count(*) from categories where deleted_at is null)::text as categories,
        (select count(*) from warehouses where deleted_at is null)::text as warehouses,
        (select count(*) from suppliers where deleted_at is null)::text as suppliers
    `);

    const [today] = await raw<{ movements_today: string; in_today: string; out_today: string }>(`
      select
        count(*)::text as movements_today,
        coalesce(sum(quantity) filter (where type in ('IN','RETURN')), 0)::text as in_today,
        coalesce(sum(quantity) filter (where type in ('OUT','TRANSFER')), 0)::text as out_today
      from stock_movements where created_at >= date_trunc('day', now())
    `);

    const movementSeries = await raw<{ day: string; stock_in: string; stock_out: string }>(`
      select to_char(d.day, 'YYYY-MM-DD') as day,
        coalesce(sum(m.quantity) filter (where m.type in ('IN','RETURN')), 0)::text as stock_in,
        coalesce(sum(m.quantity) filter (where m.type in ('OUT','TRANSFER')), 0)::text as stock_out
      from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as d(day)
      left join stock_movements m on date_trunc('day', m.created_at) = d.day
      group by d.day order by d.day
    `);

    const valueSeries = await raw<{ day: string; value: string }>(`
      with base as (
        select coalesce(sum(current_stock * purchase_price), 0) as v from products where deleted_at is null
      ),
      days as (
        select generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as day
      ),
      deltas as (
        select d.day,
          coalesce(sum(case when m.type in ('IN','RETURN') then m.quantity * coalesce(m.unit_cost,0)
                            when m.type in ('OUT','TRANSFER') then -m.quantity * coalesce(m.unit_cost,0)
                            else 0 end), 0) as delta
        from days d left join stock_movements m on date_trunc('day', m.created_at) > d.day
        group by d.day
      )
      select to_char(deltas.day, 'YYYY-MM-DD') as day, (base.v - deltas.delta)::text as value
      from deltas, base order by deltas.day
    `);

    const categoryDistribution = await raw<{
      name: string;
      color: string;
      products: string;
      value: string;
    }>(`
      select c.name, c.color,
        count(p.id)::text as products,
        coalesce(sum(p.current_stock * p.purchase_price), 0)::text as value
      from categories c
      left join products p on p.category_id = c.id and p.deleted_at is null
      where c.deleted_at is null
      group by c.id order by sum(p.current_stock * p.purchase_price) desc nulls last limit 8
    `);

    const topMoved = await raw<{ name: string; sku: string; moves: string; units: string }>(`
      select p.name, p.sku, count(m.id)::text as moves, coalesce(sum(m.quantity),0)::text as units
      from stock_movements m join products p on p.id = m.product_id
      where m.created_at >= now() - interval '30 days'
      group by p.id order by sum(m.quantity) desc limit 7
    `);

    const recentActivity = await raw(`
      select m.id, m.type, m.quantity, m.new_quantity, m.created_at,
             p.name as product_name, p.sku, u.full_name as user_name
      from stock_movements m
      join products p on p.id = m.product_id
      left join users u on u.id = m.user_id
      order by m.created_at desc limit 8
    `);

    const lowStockProducts = await raw(`
      select id, name, sku, current_stock, min_stock, unit
      from products
      where deleted_at is null and current_stock <= min_stock
      order by (current_stock - min_stock) asc limit 8
    `);

    const warehouseBreakdown = await raw<{ name: string; units: string; value: string }>(`
      select w.name, coalesce(sum(p.current_stock),0)::text as units,
             coalesce(sum(p.current_stock * p.purchase_price),0)::text as value
      from warehouses w
      left join products p on p.warehouse_id = w.id and p.deleted_at is null
      where w.deleted_at is null
      group by w.id order by w.name
    `);

    return ok({
      kpi: {
        totalProducts: Number(kpi?.total_products ?? 0),
        totalValue: Number(kpi?.total_value ?? 0),
        retailValue: Number(kpi?.retail_value ?? 0),
        totalUnits: Number(kpi?.total_units ?? 0),
        lowStock: Number(kpi?.low_stock ?? 0),
        outOfStock: Number(kpi?.out_of_stock ?? 0),
        categories: Number(counts?.categories ?? 0),
        warehouses: Number(counts?.warehouses ?? 0),
        suppliers: Number(counts?.suppliers ?? 0),
        movementsToday: Number(today?.movements_today ?? 0),
        stockInToday: Number(today?.in_today ?? 0),
        stockOutToday: Number(today?.out_today ?? 0),
      },
      movementSeries: movementSeries.map((r) => ({
        day: r.day,
        stockIn: Number(r.stock_in),
        stockOut: Number(r.stock_out),
      })),
      valueSeries: valueSeries.map((r) => ({ day: r.day, value: Number(r.value) })),
      categoryDistribution: categoryDistribution.map((r) => ({
        name: r.name,
        color: r.color,
        products: Number(r.products),
        value: Number(r.value),
      })),
      topMoved: topMoved.map((r) => ({
        name: r.name,
        sku: r.sku,
        moves: Number(r.moves),
        units: Number(r.units),
      })),
      recentActivity,
      lowStockProducts,
      warehouseBreakdown: warehouseBreakdown.map((r) => ({
        name: r.name,
        units: Number(r.units),
        value: Number(r.value),
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
