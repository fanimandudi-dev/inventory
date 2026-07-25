import "dotenv/config";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "./index";
import {
  auditLogs,
  categories,
  notifications,
  products,
  qrLabels,
  stockMovements,
  suppliers,
  users,
  warehouseLocations,
  warehouses,
} from "./schema";
import { buildQrPayload, encodeQr } from "../lib/qr";
import { slugify } from "../lib/utils";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Resetting tables…");
  await db.execute(
    sql`truncate table audit_logs, notifications, qr_labels, stock_movements, products, warehouse_locations, warehouses, suppliers, categories, sessions, users restart identity cascade`,
  );

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const userRows = await db
    .insert(users)
    .values([
      {
        email: "admin@stockflow.io",
        passwordHash,
        fullName: "Amelia Rousseau",
        role: "ADMIN" as const,
        jobTitle: "Head of Operations",
        phone: "+33 6 12 45 78 90",
      },
      {
        email: "manager@stockflow.io",
        passwordHash,
        fullName: "Marc Delaunay",
        role: "MANAGER" as const,
        jobTitle: "Inventory Manager",
        phone: "+33 6 88 21 09 33",
      },
      {
        email: "employee@stockflow.io",
        passwordHash,
        fullName: "Sofia Nakamura",
        role: "EMPLOYEE" as const,
        jobTitle: "Warehouse Operator",
        phone: "+33 7 55 12 76 40",
      },
      {
        email: "auditor@stockflow.io",
        passwordHash,
        fullName: "Julien Bertrand",
        role: "AUDITOR" as const,
        jobTitle: "Compliance Auditor",
        phone: "+33 6 77 90 12 34",
      },
    ])
    .returning();
  console.log(`  ${userRows.length} users`);

  const categoryData = [
    ["Electronics", "#6366f1"],
    ["Computer Hardware", "#0ea5e9"],
    ["Networking", "#14b8a6"],
    ["Office Supplies", "#f59e0b"],
    ["Packaging", "#a855f7"],
    ["Safety Equipment", "#ef4444"],
    ["Tools", "#22c55e"],
    ["Consumables", "#eab308"],
  ];
  const categoryRows = await db
    .insert(categories)
    .values(
      categoryData.map(([name, color]) => ({
        name,
        slug: slugify(name),
        color,
        description: `${name} stock keeping units tracked across all warehouses.`,
      })),
    )
    .returning();

  const supplierRows = await db
    .insert(suppliers)
    .values([
      {
        name: "Northwind Components",
        contactPerson: "Erik Lindqvist",
        email: "erik@northwind-components.se",
        phone: "+46 8 555 019",
        address: "Sveavägen 44",
        country: "Sweden",
        notes: "Primary electronics supplier, 12 day lead time.",
      },
      {
        name: "Lyon Industrial Supply",
        contactPerson: "Camille Fontaine",
        email: "camille@lyon-industrial.fr",
        phone: "+33 4 72 11 88 20",
        address: "18 Rue de la Villette",
        country: "France",
        notes: "Tools and safety gear, monthly consolidated invoicing.",
      },
      {
        name: "Shenzhen TechParts",
        contactPerson: "Li Wei",
        email: "liwei@sztechparts.cn",
        phone: "+86 755 8899 1200",
        address: "Futian District, Block C",
        country: "China",
        notes: "Best pricing on computer hardware, 30 day sea freight.",
      },
      {
        name: "Atlas Packaging Group",
        contactPerson: "Nora Haddad",
        email: "nora@atlaspack.ma",
        phone: "+212 522 44 55 66",
        address: "Zone Industrielle Ain Sebaa",
        country: "Morocco",
        notes: "Cartons, pallets and protective packaging.",
      },
      {
        name: "Rhein Office Partners",
        contactPerson: "Jonas Keller",
        email: "jonas@rheinoffice.de",
        phone: "+49 221 998 4410",
        address: "Hansaring 22",
        country: "Germany",
        notes: "Office consumables with next-day delivery.",
      },
      {
        name: "Iberia Network Systems",
        contactPerson: "Marta Ruiz",
        email: "marta@iberianet.es",
        phone: "+34 91 220 44 90",
        address: "Calle Serrano 88",
        country: "Spain",
        notes: "Networking hardware and certified installs.",
      },
    ])
    .returning();

  const warehouseRows = await db
    .insert(warehouses)
    .values([
      {
        name: "Paris Central Hub",
        code: "PAR",
        address: "12 Avenue de la Logistique",
        city: "Paris",
        country: "France",
        manager: "Marc Delaunay",
      },
      {
        name: "Lyon Distribution Center",
        code: "LYS",
        address: "77 Boulevard du Fret",
        city: "Lyon",
        country: "France",
        manager: "Camille Fontaine",
      },
      {
        name: "Rotterdam Port Depot",
        code: "RTM",
        address: "Havenweg 210",
        city: "Rotterdam",
        country: "Netherlands",
        manager: "Sanne de Vries",
      },
    ])
    .returning();

  const locationValues = warehouseRows.flatMap((w) =>
    ["A", "B", "C"].flatMap((zone) =>
      [1, 2, 3].flatMap((shelf) =>
        [1, 2].map((bin) => ({
          warehouseId: w.id,
          zone,
          shelf: `S${shelf}`,
          bin: `B${bin}`,
          label: `${w.code}-${zone}-S${shelf}-B${bin}`,
        })),
      ),
    ),
  );
  const locationRows = await db.insert(warehouseLocations).values(locationValues).returning();

  const catalogue: [string, string, number, number][] = [
    ["Wireless Barcode Scanner X3", "Electronics", 120, 219],
    ["Thermal Label Printer 4x6", "Electronics", 180, 329],
    ["Rugged Warehouse Tablet 10\"", "Electronics", 340, 599],
    ["USB-C Docking Station Pro", "Computer Hardware", 92, 169],
    ["NVMe SSD 1TB Enterprise", "Computer Hardware", 78, 139],
    ["DDR5 RAM Module 16GB", "Computer Hardware", 54, 99],
    ["24-Port Gigabit Switch", "Networking", 145, 259],
    ["Wi-Fi 6 Access Point", "Networking", 110, 199],
    ["CAT6 Patch Cable 3m (10pk)", "Networking", 22, 45],
    ["Fiber Optic Patch Cord LC", "Networking", 14, 32],
    ["A4 Copy Paper Ream", "Office Supplies", 3, 7],
    ["Ergonomic Office Chair", "Office Supplies", 145, 289],
    ["Whiteboard Marker Pack", "Office Supplies", 4, 11],
    ["Desk Organizer Steel", "Office Supplies", 12, 27],
    ["Double Wall Carton 60x40", "Packaging", 1, 3],
    ["Stretch Wrap Film Roll", "Packaging", 8, 18],
    ["Euro Pallet Heavy Duty", "Packaging", 14, 29],
    ["Bubble Wrap 100m Roll", "Packaging", 19, 39],
    ["Shipping Tape Dispenser", "Packaging", 6, 14],
    ["Safety Helmet EN397", "Safety Equipment", 16, 34],
    ["High-Vis Vest Class 2", "Safety Equipment", 7, 16],
    ["Cut Resistant Gloves L", "Safety Equipment", 9, 21],
    ["Steel Toe Boots 43", "Safety Equipment", 52, 98],
    ["First Aid Kit Industrial", "Safety Equipment", 34, 69],
    ["Cordless Impact Drill 18V", "Tools", 88, 165],
    ["Pallet Jack 2500kg", "Tools", 320, 549],
    ["Torque Wrench Set", "Tools", 74, 139],
    ["Measuring Tape 8m", "Tools", 6, 15],
    ["Utility Knife Retractable", "Tools", 4, 9],
    ["Thermal Receipt Paper Roll", "Consumables", 2, 5],
    ["Label Ribbon Wax 110mm", "Consumables", 11, 24],
    ["Industrial Cleaning Wipes", "Consumables", 8, 17],
    ["Zip Ties 200mm (500pk)", "Consumables", 5, 12],
    ["Barcode Label Sheets A4", "Consumables", 7, 16],
    ["Handheld RFID Reader", "Electronics", 410, 749],
    ["Warehouse Ring Scanner", "Electronics", 265, 449],
    ["Mini PC Edge Gateway", "Computer Hardware", 210, 379],
    ["PoE Injector 60W", "Networking", 26, 55],
    ["Anti-Static Mat", "Safety Equipment", 21, 44],
    ["Digital Caliper 150mm", "Tools", 18, 39],
  ];

  const productValues = catalogue.map(([name, categoryName, cost, price], index) => {
    const category = categoryRows.find((c) => c.name === categoryName)!;
    const warehouse = warehouseRows[index % warehouseRows.length];
    const location = pick(locationRows.filter((l) => l.warehouseId === warehouse.id));
    const minStock = rand(8, 30);
    const roll = Math.random();
    const currentStock =
      roll < 0.1 ? 0 : roll < 0.25 ? rand(1, minStock) : rand(minStock + 5, minStock * 8);
    return {
      name,
      sku: `${category.name.slice(0, 3).toUpperCase()}-${String(1000 + index)}`,
      barcode: String(3600000000000 + index * 7717),
      qrToken: randomBytes(8).toString("hex"),
      description: `${name} — stocked at ${warehouse.name}. Managed under ${category.name}.`,
      categoryId: category.id,
      supplierId: pick(supplierRows).id,
      warehouseId: warehouse.id,
      locationId: location.id,
      purchasePrice: cost.toFixed(2),
      sellingPrice: price.toFixed(2),
      currentStock,
      reservedStock: currentStock > 0 ? rand(0, Math.min(5, currentStock)) : 0,
      minStock,
      maxStock: minStock * 10,
      unit: "unit",
      status: "ACTIVE" as const,
    };
  });

  const productRows = await db.insert(products).values(productValues).returning();
  console.log(`  ${productRows.length} products`);

  await db.insert(qrLabels).values(
    productRows.map((p) => {
      const wh = warehouseRows.find((w) => w.id === p.warehouseId);
      const payload = buildQrPayload({ ...p, warehouseCode: wh?.code ?? null });
      return { productId: p.id, payload: encodeQr(payload), checksum: payload.sig };
    }),
  );

  const reasons = {
    IN: ["Supplier delivery", "Purchase order receipt", "Restock", "Production output"],
    OUT: ["Customer order", "Store transfer", "Sales pick", "B2B shipment"],
    ADJUSTMENT: ["Cycle count correction", "Damaged goods", "Shrinkage"],
    RETURN: ["Customer return", "Supplier credit"],
    TRANSFER: ["Inter-warehouse transfer"],
    COUNT: ["Annual inventory count"],
  };
  const types = ["IN", "OUT", "OUT", "IN", "ADJUSTMENT", "RETURN", "TRANSFER", "COUNT"] as const;

  const movementValues: (typeof stockMovements.$inferInsert)[] = [];
  for (let day = 45; day >= 0; day--) {
    const perDay = day < 7 ? rand(6, 14) : rand(3, 9);
    for (let i = 0; i < perDay; i++) {
      const product = pick(productRows);
      const type = pick([...types]);
      const quantity = rand(1, 40);
      const previous = rand(quantity, quantity + 120);
      const next =
        type === "IN" || type === "RETURN"
          ? previous + quantity
          : type === "COUNT"
            ? quantity
            : Math.max(0, previous - quantity);
      const createdAt = new Date(
        Date.now() - day * 86400000 + rand(8, 19) * 3600000 + rand(0, 59) * 60000,
      );
      movementValues.push({
        productId: product.id,
        userId: pick(userRows.filter((u) => u.role !== "AUDITOR")).id,
        warehouseId: product.warehouseId,
        type,
        quantity,
        previousQuantity: previous,
        newQuantity: next,
        unitCost: product.purchasePrice,
        reason: pick(reasons[type]),
        notes: Math.random() > 0.7 ? "Verified by QR scan on the floor." : null,
        reference: `MOV-${rand(10000, 99999)}`,
        createdAt,
      });
    }
  }
  await db.insert(stockMovements).values(movementValues);
  console.log(`  ${movementValues.length} stock movements`);

  const lowStock = productRows.filter((p) => p.currentStock <= p.minStock).slice(0, 12);
  await db.insert(notifications).values([
    ...lowStock.map((p) => ({
      userId: pick(userRows).id,
      type: (p.currentStock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK") as "OUT_OF_STOCK" | "LOW_STOCK",
      title: p.currentStock <= 0 ? "Out of stock" : "Low stock alert",
      message: `${p.name} (${p.sku}) is at ${p.currentStock} units — minimum is ${p.minStock}.`,
      entityId: p.id,
      isRead: Math.random() > 0.6,
      createdAt: new Date(Date.now() - rand(0, 72) * 3600000),
    })),
    {
      userId: userRows[0].id,
      type: "SYSTEM" as const,
      title: "Weekly inventory report ready",
      message: "The valuation report for the current week has been generated.",
      isRead: false,
    },
    {
      userId: userRows[1].id,
      type: "MOVEMENT" as const,
      title: "High volume day",
      message: "Paris Central Hub processed more than 120 units today.",
      isRead: false,
    },
  ]);

  const actions = ["CREATE", "UPDATE", "DELETE", "LOGIN", "SCAN", "STOCK_IN", "STOCK_OUT", "EXPORT"];
  const entities = ["Product", "Category", "Supplier", "Warehouse", "StockMovement", "User"];
  await db.insert(auditLogs).values(
    Array.from({ length: 120 }).map(() => {
      const product = pick(productRows);
      return {
        userId: pick(userRows).id,
        action: pick(actions),
        entity: pick(entities),
        entityId: product.id,
        beforeValue: { currentStock: rand(0, 100) },
        afterValue: { currentStock: rand(0, 100) },
        ipAddress: `10.0.${rand(0, 12)}.${rand(2, 250)}`,
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
        createdAt: new Date(Date.now() - rand(0, 30) * 86400000 - rand(0, 86400) * 1000),
      };
    }),
  );

  console.log("Seed complete. Login with admin@stockflow.io / Password123!");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
